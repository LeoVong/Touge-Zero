import * as THREE from "three";
import type { CourseDef, TrackData, TrackSample } from "./types";

function segsToXZ(segs: CourseDef["segs"]): { x: number; z: number }[] {
  let x = 0;
  let z = 0;
  let yaw = 0;
  const pts = [{ x, z }];
  const step = 5.5;
  for (const seg of segs) {
    if (seg.t === "s") {
      const n = Math.max(1, Math.round(seg.l / step));
      const ds = seg.l / n;
      for (let i = 0; i < n; i++) {
        x += -Math.sin(yaw) * ds;
        z += -Math.cos(yaw) * ds;
        pts.push({ x, z });
      }
    } else {
      const rad = (seg.deg * Math.PI) / 180;
      const arcLen = Math.abs(rad) * seg.r;
      const n = Math.max(4, Math.round(arcLen / step));
      const dyaw = rad / n;
      const ds = arcLen / n;
      for (let i = 0; i < n; i++) {
        yaw += dyaw;
        x += -Math.sin(yaw) * ds;
        z += -Math.cos(yaw) * ds;
        pts.push({ x, z });
      }
    }
  }
  return pts;
}

function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function roadTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#7a7e88";
  g.fillRect(0, 0, 64, 256);
  const img = g.getImageData(0, 0, 64, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (hash(i) - 0.5) * 18;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  g.putImageData(img, 0, 0);
  g.fillStyle = "#d8d6d0";
  g.fillRect(1, 0, 3, 256);
  g.fillRect(60, 0, 3, 256);
  g.fillStyle = "#cfc8a8";
  for (let y = 0; y < 256; y += 28) g.fillRect(30, y, 3, 15);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export type TrackWorld = {
  data: TrackData;
  group: THREE.Group;
  dispose: () => void;
};

export function buildTrack(course: CourseDef): TrackWorld {
  const xz = segsToXZ(course.segs);
  const lengths = [0];
  let acc = 0;
  for (let i = 1; i < xz.length; i++) {
    acc += Math.hypot(xz[i].x - xz[i - 1].x, xz[i].z - xz[i - 1].z);
    lengths.push(acc);
  }
  const drop = course.endY - course.startY;
  const raw = xz.map(
    (p, i) => new THREE.Vector3(p.x, course.startY + drop * (acc > 0 ? lengths[i] / acc : 0), p.z),
  );
  const curve = new THREE.CatmullRomCurve3(raw, false, "catmullrom", 0.12);
  const total = curve.getLength();
  const spacing = 2;
  const n = Math.max(8, Math.ceil(total / spacing));
  const frames = curve.computeFrenetFrames(n, false);
  const pts = curve.getSpacedPoints(n);

  const samples: TrackSample[] = [];
  let run = 0;
  for (let i = 0; i <= n; i++) {
    const p = pts[i];
    const tng = frames.tangents[i];
    const bin = frames.binormals[i];
    if (i > 0) run += p.distanceTo(pts[i - 1]);
    let right = new THREE.Vector3().crossVectors(tng, new THREE.Vector3(0, 1, 0));
    if (right.lengthSq() < 1e-6) right = bin.clone();
    right.y = 0;
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const up = new THREE.Vector3().crossVectors(right, tng).normalize();
    let curv = 0;
    if (i > 0) {
      const prev = frames.tangents[i - 1];
      curv = Math.atan2(tng.x * prev.z - tng.z * prev.x, tng.x * prev.x + tng.z * prev.z);
    }
    samples.push({
      x: p.x,
      y: p.y,
      z: p.z,
      tx: tng.x,
      ty: tng.y,
      tz: tng.z,
      rx: right.x,
      ry: right.y,
      rz: right.z,
      ux: up.x,
      uy: up.y,
      uz: up.z,
      dist: run,
      t: run / Math.max(total, 0.001),
      halfWidth: course.halfWidth,
      curv,
    });
  }

  const cpCount = 8;
  const checkpoints: number[] = [];
  for (let i = 1; i <= cpCount; i++) {
    const want = (i / cpCount) * (samples.length - 1);
    checkpoints.push(Math.min(samples.length - 1, Math.round(want)));
  }

  const data: TrackData = { samples, length: run, checkpoints, halfWidth: course.halfWidth };
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];

  const tex = roadTexture();
  tex.repeat.set(1, total / 7);
  disposables.push(tex);

  const verts: number[] = [];
  const uvs: number[] = [];
  const norms: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const lx = s.x - s.rx * s.halfWidth;
    const lz = s.z - s.rz * s.halfWidth;
    const rx = s.x + s.rx * s.halfWidth;
    const rz = s.z + s.rz * s.halfWidth;
    const y = s.y + 0.04;
    verts.push(lx, y, lz, rx, y, rz);
    uvs.push(0, s.dist / 7, 1, s.dist / 7);
    norms.push(s.ux, s.uy, s.uz, s.ux, s.uy, s.uz);
    if (i > 0) {
      const a = (i - 1) * 2;
      const b = a + 1;
      const c = i * 2;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  roadGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  roadGeo.setAttribute("normal", new THREE.Float32BufferAttribute(norms, 3));
  roadGeo.setIndex(idx);
  roadGeo.computeVertexNormals();
  const roadMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.62,
    metalness: 0.0,
    color: 0xffffff,
    emissive: 0x3a4458,
    emissiveIntensity: 0.42,
  });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.receiveShadow = true;
  group.add(road);
  disposables.push(roadGeo, roadMat);

  const shoulderVerts: number[] = [];
  const shoulderIdx: number[] = [];
  const extra = 1.35;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const w = s.halfWidth;
    const y = s.y + 0.01;
    shoulderVerts.push(
      s.x - s.rx * (w + extra),
      y,
      s.z - s.rz * (w + extra),
      s.x - s.rx * w,
      y,
      s.z - s.rz * w,
      s.x + s.rx * w,
      y,
      s.z + s.rz * w,
      s.x + s.rx * (w + extra),
      y,
      s.z + s.rz * (w + extra),
    );
    if (i > 0) {
      const a = (i - 1) * 4;
      const b = i * 4;
      shoulderIdx.push(a, b, a + 1, a + 1, b, b + 1);
      shoulderIdx.push(a + 2, b + 2, a + 3, a + 3, b + 2, b + 3);
    }
  }
  const shGeo = new THREE.BufferGeometry();
  shGeo.setAttribute("position", new THREE.Float32BufferAttribute(shoulderVerts, 3));
  shGeo.setIndex(shoulderIdx);
  shGeo.computeVertexNormals();
  const shMat = new THREE.MeshStandardMaterial({
    color: 0x4a5244,
    roughness: 0.9,
    emissive: 0x1a2018,
    emissiveIntensity: 0.25,
  });
  group.add(new THREE.Mesh(shGeo, shMat));
  disposables.push(shGeo, shMat);

  const railGeo = new THREE.BoxGeometry(0.08, 0.12, 1.95);
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xb4bac4,
    metalness: 0.42,
    roughness: 0.36,
  });
  const postGeo = new THREE.BoxGeometry(0.07, 0.72, 0.07);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x6a7078, roughness: 0.55, metalness: 0.28 });
  const railCount = Math.floor(samples.length / 1) * 2;
  const rails = new THREE.InstancedMesh(railGeo, railMat, railCount);
  const posts = new THREE.InstancedMesh(postGeo, postMat, Math.ceil(samples.length / 2) * 2);
  const dummy = new THREE.Object3D();
  let ri = 0;
  let pi = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const yaw = Math.atan2(s.tx, s.tz);
    for (const side of [-1, 1] as const) {
      dummy.position.set(s.x + s.rx * side * (s.halfWidth + 0.12), s.y + 0.62, s.z + s.rz * side * (s.halfWidth + 0.12));
      dummy.rotation.set(0, yaw, 0);
      dummy.updateMatrix();
      if (ri < railCount) rails.setMatrixAt(ri++, dummy.matrix);
      dummy.position.y = s.y + 0.36;
      dummy.updateMatrix();
      if (i % 2 === 0 && pi < posts.count) posts.setMatrixAt(pi++, dummy.matrix);
    }
  }
  rails.count = ri;
  posts.count = pi;
  rails.instanceMatrix.needsUpdate = true;
  posts.instanceMatrix.needsUpdate = true;
  rails.computeBoundingSphere();
  posts.computeBoundingSphere();
  group.add(rails, posts);
  disposables.push(railGeo, railMat, postGeo, postMat);

  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 2.2, 5);
  const leafGeo = new THREE.ConeGeometry(1.35, 4.2, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a3024, roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e4a34, roughness: 0.86, emissive: 0x0c1810, emissiveIntensity: 0.2 });
  const treeN = Math.min(520, Math.floor(total / course.treeSpacing) * 2);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeN);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, treeN);
  let ti = 0;
  for (let i = 4; i < samples.length - 4; i += 2) {
    const s = samples[i];
    for (const side of [-1, 1] as const) {
      if (course.cliff === "right" && side === 1) continue;
      if (course.cliff === "left" && side === -1) continue;
      const h = hash(i * 17 + side + 3);
      if (h < 0.22) continue;
      const dist = s.halfWidth + 4.2 + h * 7;
      const x = s.x + s.rx * side * dist + (hash(i + 9) - 0.5) * 2.4;
      const z = s.z + s.rz * side * dist + (hash(i + 13) - 0.5) * 2.4;
      const sc = 0.75 + hash(i + 21) * 0.9;
      dummy.position.set(x, s.y + 1.1 * sc, z);
      dummy.rotation.set(0, h * 6, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      if (ti < treeN) {
        trunks.setMatrixAt(ti, dummy.matrix);
        dummy.position.y = s.y + 3.2 * sc;
        dummy.updateMatrix();
        leaves.setMatrixAt(ti, dummy.matrix);
        ti++;
      }
    }
  }
  trunks.count = ti;
  leaves.count = ti;
  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  trunks.computeBoundingSphere();
  leaves.computeBoundingSphere();
  group.add(trunks, leaves);
  disposables.push(trunkGeo, leafGeo, trunkMat, leafMat);

  const lampGeo = new THREE.CylinderGeometry(0.07, 0.09, 5.4, 5);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x5a606a, metalness: 0.45, roughness: 0.45 });
  const bulbGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffe0a0,
    emissive: 0xffc060,
    emissiveIntensity: 4.2,
  });
  const lampN = Math.floor(samples.length / Math.max(6, Math.round(course.lampSpacing / 2)));
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, lampN);
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lampN);
  let li = 0;
  const lampLightEvery = Math.max(2, Math.ceil(lampN / 12));
  for (let i = 0; i < samples.length; i += Math.max(6, Math.round(course.lampSpacing / 2))) {
    const s = samples[i];
    const side = i % 2 === 0 ? 1 : -1;
    dummy.position.set(s.x + s.rx * side * (s.halfWidth + 0.7), s.y + 2.7, s.z + s.rz * side * (s.halfWidth + 0.7));
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    if (li < lampN) {
      lamps.setMatrixAt(li, dummy.matrix);
      dummy.position.y = s.y + 5.3;
      dummy.updateMatrix();
      bulbs.setMatrixAt(li, dummy.matrix);
      if (li % lampLightEvery === 0) {
        const pl = new THREE.PointLight(0xffd090, 40, 42, 1.2);
        pl.position.set(
          s.x + s.rx * side * (s.halfWidth + 0.7),
          s.y + 5.0,
          s.z + s.rz * side * (s.halfWidth + 0.7),
        );
        group.add(pl);
      }
      li++;
    }
  }
  lamps.count = li;
  bulbs.count = li;
  lamps.instanceMatrix.needsUpdate = true;
  bulbs.instanceMatrix.needsUpdate = true;
  lamps.computeBoundingSphere();
  bulbs.computeBoundingSphere();
  group.add(lamps, bulbs);
  disposables.push(lampGeo, lampMat, bulbGeo, bulbMat);

  if (course.cliff !== "none") {
    const side = course.cliff === "right" ? 1 : -1;
    const rockGeo = new THREE.BoxGeometry(1.6, 8, 3.2);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a4e56, roughness: 0.92 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, Math.floor(samples.length / 2));
    let k = 0;
    for (let i = 0; i < samples.length; i += 2) {
      const s = samples[i];
      dummy.position.set(
        s.x + s.rx * side * (s.halfWidth + 3.4),
        s.y + 3.2,
        s.z + s.rz * side * (s.halfWidth + 3.4),
      );
      dummy.rotation.set(0, Math.atan2(s.tx, s.tz), 0);
      dummy.scale.set(1 + hash(i) * 0.8, 0.8 + hash(i + 4) * 1.4, 1);
      dummy.updateMatrix();
      if (k < rocks.count) rocks.setMatrixAt(k++, dummy.matrix);
    }
    rocks.count = k;
    rocks.instanceMatrix.needsUpdate = true;
    rocks.computeBoundingSphere();
    group.add(rocks);
    disposables.push(rockGeo, rockMat);
  }

  const gantry = (sample: TrackSample, color: number) => {
    const g = new THREE.Group();
    const poleM = new THREE.MeshStandardMaterial({ color: 0x22252c, metalness: 0.4, roughness: 0.5 });
    const beamM = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55 });
    const poleGeo = new THREE.BoxGeometry(0.16, 4.2, 0.16);
    const beamGeo = new THREE.BoxGeometry(sample.halfWidth * 2 + 1.2, 0.25, 0.18);
    const p1 = new THREE.Mesh(poleGeo, poleM);
    const p2 = new THREE.Mesh(poleGeo, poleM);
    const beam = new THREE.Mesh(beamGeo, beamM);
    p1.position.set(-sample.halfWidth - 0.4, 2.1, 0);
    p2.position.set(sample.halfWidth + 0.4, 2.1, 0);
    beam.position.set(0, 4.05, 0);
    g.add(p1, p2, beam);
    g.position.set(sample.x, sample.y, sample.z);
    g.lookAt(sample.x + sample.tx, sample.y, sample.z + sample.tz);
    group.add(g);
    disposables.push(poleGeo, beamGeo, poleM, beamM);
  };
  gantry(samples[4], 0xc41e1e);
  gantry(samples[samples.length - 3], 0xe8e0d4);

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(1800);
  for (let i = 0; i < 600; i++) {
    const th = hash(i * 3) * Math.PI * 2;
    const ph = hash(i * 7) * 0.55 + 0.12;
    const r = 420;
    starPos[i * 3] = Math.cos(th) * Math.cos(ph) * r;
    starPos[i * 3 + 1] = Math.sin(ph) * r + 40;
    starPos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * r;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xdde6ff, size: 0.9, sizeAttenuation: true });
  group.add(new THREE.Points(starGeo, starMat));
  disposables.push(starGeo, starMat);

  const moonGeo = new THREE.CircleGeometry(16, 24);
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xeef2fa, fog: false });
  const moon = new THREE.Mesh(moonGeo, moonMat);
  moon.position.set(-80, 110, -160);
  moon.lookAt(0, 0, 0);
  group.add(moon);
  disposables.push(moonGeo, moonMat);

  return {
    data,
    group,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}
