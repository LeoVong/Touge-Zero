import * as THREE from "three";
import type { CarDef } from "./types";

export function createCarMesh(def: CarDef): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.38,
    metalness: 0.35,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: def.accent,
    roughness: 0.5,
    metalness: 0.25,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x151820,
    roughness: 0.12,
    metalness: 0.7,
    transparent: true,
    opacity: 0.72,
  });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, metalness: 0.8, roughness: 0.25 });
  const head = new THREE.MeshStandardMaterial({
    color: 0xfff4d2,
    emissive: 0xffe8a8,
    emissiveIntensity: 2.2,
  });
  const tail = new THREE.MeshStandardMaterial({
    color: 0xc41e1e,
    emissive: 0xc41e1e,
    emissiveIntensity: 1.6,
  });

  const L = def.length;
  const W = def.width;
  const H = def.height;

  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H * 0.42, L * 0.92), bodyMat);
  body.position.set(0, H * 0.38, L * 0.02);
  g.add(body);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, H * 0.12, L * 0.34), accentMat);
  hood.position.set(0, H * 0.52, -L * 0.22);
  g.add(hood);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(W * 0.78, H * 0.38, L * 0.42), glassMat);
  cabin.position.set(0, H * 0.72, L * 0.06);
  g.add(cabin);

  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(W * 0.82, 0.05, 0.18), accentMat);
  spoiler.position.set(0, H * 0.62, L * 0.42);
  g.add(spoiler);

  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.18, 0.22), accentMat);
  bumperF.position.set(0, H * 0.22, -L * 0.46);
  g.add(bumperF);
  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.18, 0.18), accentMat);
  bumperR.position.set(0, H * 0.22, L * 0.46);
  g.add(bumperR);

  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.08), head);
    hl.position.set(sx * W * 0.32, H * 0.38, -L * 0.48);
    g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.06), tail);
    tl.position.set(sx * W * 0.32, H * 0.4, L * 0.48);
    g.add(tl);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.18), chrome);
    mirror.position.set(sx * (W * 0.52), H * 0.58, -L * 0.05);
    g.add(mirror);
  }

  const wheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const w = new THREE.Mesh(wheelGeo, rubber);
    w.position.set(sx * (W * 0.48), 0.32, sz * (L * 0.32));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.24, 8), chrome);
    hub.rotation.z = Math.PI / 2;
    w.add(hub);
    g.add(w);
    wheels.push(w);
  }
  g.userData.wheels = wheels;
  g.userData.frontWheels = [wheels[0], wheels[1]];

  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  g.add(blob);

  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  return g;
}

export function updateCarMesh(mesh: THREE.Group, speed: number, steer: number, dt: number) {
  const wheels = mesh.userData.wheels as THREE.Mesh[] | undefined;
  const front = mesh.userData.frontWheels as THREE.Mesh[] | undefined;
  if (wheels) {
    const spin = (speed / 0.32) * dt;
    for (const w of wheels) w.rotation.x -= spin;
  }
  if (front) {
    const ang = steer * 0.42;
    for (const w of front) w.rotation.y = ang;
  }
}
