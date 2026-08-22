import * as THREE from "three";
import type { CameraMode, CarId, CourseId, GameMode, HudSnap, RaceResult } from "./types";
import { FIXED_DT } from "./types";
import { carById } from "./cars";
import { courseById } from "./courses";
import { buildTrack, type TrackWorld } from "./track";
import { createCarMesh, updateCarMesh } from "./car-mesh";
import { Input } from "./input";
import { GameAudio } from "./audio";
import { respawn, spawnState, stepCar } from "./physics";
import { makeRival, stepRival } from "./rival";
import { recordBest } from "./save";
import type { CarState } from "./types";

export type EngineOpts = {
  courseId: CourseId;
  carId: CarId;
  mode: GameMode;
  muted: boolean;
  shake: boolean;
  onHud: (s: HudSnap) => void;
  onFinish: (r: RaceResult) => void;
  onPauseToggle: () => void;
};

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getSteer?: () => number;
      setSteer?: (v: number | null) => void;
      setKeys?: (codes: string[]) => void;
    };
  }
}

export class GameEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clockLast = 0;
  private acc = 0;
  private running = false;
  private disposed = false;
  private paused = false;
  private input = new Input();
  private audio = new GameAudio();
  private track: TrackWorld;
  private player: CarState;
  private rival: CarState | null = null;
  private playerMesh: THREE.Group;
  private rivalMesh: THREE.Group | null = null;
  private headlights: THREE.SpotLight[] = [];
  private camLook = new THREE.Vector3();
  private camPos = new THREE.Vector3();
  private cameraMode: CameraMode = "chase";
  private countdown = 3;
  private countTick = 0;
  private go = false;
  private time = 0;
  private finished = false;
  private maxSpeed = 0;
  private driftScore = 0;
  private trauma = 0;
  private sparks: THREE.Points;
  private sparkVel: Float32Array;
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private resizeObs: ResizeObserver;
  private hudFrame = 0;
  private lastCount = 4;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: EngineOpts,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setClearColor(0x24344c, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.85;

    this.scene = new THREE.Scene();
    const course = courseById(opts.courseId);
    const fogFar = Math.max(160, 1.2 / Math.max(course.fog, 0.002));
    this.scene.fog = new THREE.Fog(0x4a5c78, 28, fogFar);
    this.scene.background = new THREE.Color(0x24344c);

    this.camera = new THREE.PerspectiveCamera(64, 1, 0.15, 520);
    this.scene.add(this.camera);

    const hemi = new THREE.HemisphereLight(0xa8bce0, 0x3a3224, 1.85);
    this.scene.add(hemi);
    const moon = new THREE.DirectionalLight(0xf0f4ff, 2.2);
    moon.position.set(-40, 80, -30);
    this.scene.add(moon);
    const bounce = new THREE.DirectionalLight(0x6a80a8, 0.85);
    bounce.position.set(35, 30, 45);
    this.scene.add(bounce);
    const amb = new THREE.AmbientLight(0x5a6a84, 1.35);
    this.scene.add(amb);

    this.track = buildTrack(course);
    this.scene.add(this.track.group);

    const carDef = carById(opts.carId);
    this.player = spawnState(this.track.data, 3);
    this.playerMesh = createCarMesh(carDef);
    this.scene.add(this.playerMesh);

    if (opts.mode === "battle") {
      this.rival = makeRival(this.track.data, 16);
      this.rivalMesh = createCarMesh({ ...carById("ryse"), color: 0x8a1c1c, accent: 0x1a0808 });
      this.scene.add(this.rivalMesh);
    }

    for (const side of [-1, 1]) {
      const spot = new THREE.SpotLight(0xfff6e0, 160, 130, 0.62, 0.32, 1.0);
      spot.position.set(side * 0.55, 0.62, -1.6);
      const tgt = new THREE.Object3D();
      tgt.position.set(side * 0.15, -0.15, -26);
      this.playerMesh.add(spot);
      this.playerMesh.add(tgt);
      spot.target = tgt;
      this.headlights.push(spot);
    }
    const fillSpot = new THREE.SpotLight(0xeef4ff, 80, 90, 1.05, 0.5, 1.0);
    fillSpot.position.set(0, 2.8, 1.4);
    const fillTgt = new THREE.Object3D();
    fillTgt.position.set(0, -0.4, -18);
    this.playerMesh.add(fillSpot);
    this.playerMesh.add(fillTgt);
    fillSpot.target = fillTgt;
    this.headlights.push(fillSpot);

    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(96 * 3);
    this.sparkVel = new Float32Array(96 * 3);
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffc070,
      size: 0.12,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.sparks = new THREE.Points(sparkGeo, sparkMat);
    this.scene.add(this.sparks);

    this.input.attach();
    this.audio.setMuted(opts.muted);
    this.fit();
    const qa = typeof location !== "undefined" && new URLSearchParams(location.search).has("qa");
    if (qa) {
      this.go = true;
      this.countdown = 0;
      this.countTick = 4;
    }
    this.resizeObs = new ResizeObserver(() => this.fit());
    this.resizeObs.observe(canvas.parentElement ?? canvas);

    this.placeMesh(this.playerMesh, this.player);
    this.snapCamera(true);

    window.__controlsTest = {
      getYaw: () => this.player.yaw,
      getSpeed: () => this.player.speed,
      getSteer: () => this.input.lastSteer,
      setSteer: (v) => {
        this.input.qaSteer = v;
      },
      setKeys: (codes) => this.input.setKeys(codes),
    };
  }

  setMuted(m: boolean) {
    this.audio.setMuted(m);
  }

  setPaused(p: boolean) {
    this.paused = p;
  }

  setTouchSteer(v: number) {
    this.input.touchSteer = v;
  }
  setTouchThrottle(v: number) {
    this.input.touchThrottle = v;
  }
  setTouchBrake(v: number) {
    this.input.touchBrake = v;
  }
  setTouchDrift(v: boolean) {
    this.input.touchDrift = v;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clockLast = performance.now();
    this.audio.unlock();
    this.renderer.setAnimationLoop(this.frame);
  }

  dispose() {
    this.disposed = true;
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.input.detach();
    this.audio.dispose();
    this.resizeObs.disconnect();
    this.track.dispose();
    this.renderer.dispose();
    if (window.__controlsTest) delete window.__controlsTest;
  }

  private fit() {
    const parent = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(16, parent.clientWidth);
    const h = Math.max(16, parent.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    let dt = (now - this.clockLast) / 1000;
    this.clockLast = now;
    if (!Number.isFinite(dt) || dt <= 0) dt = FIXED_DT;
    dt = Math.min(dt, 0.1);

    if (this.paused) {
      this.pushHud();
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.acc += dt;
    let steps = 0;
    while (this.acc >= FIXED_DT && steps < 5) {
      this.fixed(FIXED_DT);
      this.acc -= FIXED_DT;
      steps++;
    }
    this.visuals(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private fixed(dt: number) {
    if (!this.go) {
      this.countTick += dt;
      const n = Math.max(0, 3 - Math.floor(this.countTick));
      this.countdown = n;
      if (n !== this.lastCount) {
        this.audio.countdown(n);
        this.lastCount = n;
      }
      if (this.countTick >= 3.15) this.go = true;
    }

    const actions = this.input.poll();
    if (actions.pausePressed) this.opts.onPauseToggle();
    if (actions.cameraPressed) {
      this.cameraMode = this.cameraMode === "chase" ? "hood" : this.cameraMode === "hood" ? "wide" : "chase";
    }

    const locked = !this.go || this.finished;
    const def = carById(this.opts.carId);
    const res = stepCar(this.player, actions, def, this.track.data, dt, locked);
    if (actions.respawnPressed && this.go && !this.finished) respawn(this.player, this.track.data);
    if (res.wall) {
      this.trauma = Math.min(1, this.trauma + 0.35);
      this.burstSparks();
      this.audio.impact();
    }
    if (this.player.drifting) this.driftScore += Math.abs(this.player.latVel) * dt * 12;

    if (this.rival) {
      stepRival(this.rival, carById("ryse"), this.track.data, dt, 0.88);
      this.separate();
    }

    if (this.go && !this.finished) this.time += dt;
    this.maxSpeed = Math.max(this.maxSpeed, Math.abs(this.player.speed) * 3.6);
    this.trauma = Math.max(0, this.trauma - dt * 1.6);

    if (res.finished && !this.finished) this.complete();
    this.audio.setEngine(this.player.rpm, actions.throttle, this.player.drifting);
  }

  private separate() {
    if (!this.rival) return;
    const dx = this.player.x - this.rival.x;
    const dz = this.player.z - this.rival.z;
    const d = Math.hypot(dx, dz);
    if (d < 3.4 && d > 0.001) {
      const nx = dx / d;
      const nz = dz / d;
      const push = (3.4 - d) * 0.5;
      this.player.x += nx * push;
      this.player.z += nz * push;
      this.player.speed *= 0.97;
    }
  }

  private complete() {
    this.finished = true;
    this.audio.finish();
    const rec = recordBest(this.opts.courseId, this.time);
    let won: boolean | null = null;
    let rivalTime: number | null = null;
    if (this.opts.mode === "battle" && this.rival) {
      const p = this.player.maxIdx;
      const r = this.rival.maxIdx;
      won = p >= r;
      rivalTime = this.time + (r - p) * 0.08;
    }
    const result: RaceResult = {
      mode: this.opts.mode,
      courseId: this.opts.courseId,
      carId: this.opts.carId,
      time: this.time,
      best: rec.best,
      isRecord: rec.isRecord,
      won,
      rivalTime,
      maxSpeed: this.maxSpeed,
      driftScore: Math.round(this.driftScore),
    };
    this.opts.onFinish(result);
  }

  private visuals(dt: number) {
    this.placeMesh(this.playerMesh, this.player);
    updateCarMesh(this.playerMesh, this.player.speed, this.player.steerVis, dt);
    if (this.rival && this.rivalMesh) {
      this.placeMesh(this.rivalMesh, this.rival);
      updateCarMesh(this.rivalMesh, this.rival.speed, 0, dt);
    }
    this.followCam(dt);
    this.tickSparks(dt);
    this.hudFrame++;
    if (this.hudFrame % 2 === 0) this.pushHud();
  }

  private placeMesh(mesh: THREE.Group, car: CarState) {
    mesh.position.set(car.x, car.y, car.z);
    mesh.rotation.order = "YXZ";
    mesh.rotation.y = car.yaw;
    mesh.rotation.x = car.pitch;
    mesh.rotation.z = car.roll;
  }

  private snapCamera(hard: boolean) {
    const car = this.player;
    const fx = -Math.sin(car.yaw);
    const fz = -Math.cos(car.yaw);
    const dist = this.cameraMode === "hood" ? 0.35 : this.cameraMode === "wide" ? 9.5 : 5.8;
    const h = this.cameraMode === "hood" ? 1.05 : this.cameraMode === "wide" ? 3.4 : 1.85;
    this.camPos.set(car.x - fx * dist, car.y + h, car.z - fz * dist);
    this.camLook.set(car.x + fx * 10, car.y + 0.7, car.z + fz * 10);
    if (hard) {
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
    }
  }

  private followCam(dt: number) {
    const car = this.player;
    const fx = -Math.sin(car.yaw);
    const fz = -Math.cos(car.yaw);
    const speedKmh = Math.abs(car.speed) * 3.6;
    const dist =
      this.cameraMode === "hood" ? 0.45 : this.cameraMode === "wide" ? 10.2 : 5.6 + speedKmh * 0.012;
    const h = this.cameraMode === "hood" ? 1.08 : this.cameraMode === "wide" ? 3.6 : 1.8;
    const lookAhead = this.cameraMode === "hood" ? 16 : 11;
    this.tmp.set(car.x - fx * dist, car.y + h, car.z - fz * dist);
    this.tmp2.set(car.x + fx * lookAhead, car.y + 0.65, car.z + fz * lookAhead);
    const k = 1 - Math.exp(-(this.cameraMode === "hood" ? 14 : 6.5) * dt);
    this.camPos.lerp(this.tmp, k);
    this.camLook.lerp(this.tmp2, k);
    this.camera.position.copy(this.camPos);
    if (this.opts.shake && this.trauma > 0.01) {
      const mag = this.trauma * this.trauma * 0.28;
      this.camera.position.x += (Math.random() - 0.5) * mag;
      this.camera.position.y += (Math.random() - 0.5) * mag * 0.6;
    }
    this.camera.lookAt(this.camLook);
    const wantFov = (this.cameraMode === "hood" ? 68 : 62) + Math.min(18, speedKmh * 0.07);
    this.camera.fov += (wantFov - this.camera.fov) * (1 - Math.exp(-4 * dt));
    this.camera.updateProjectionMatrix();
  }

  private burstSparks() {
    const pos = this.sparks.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < 24; i++) {
      const ix = Math.floor(Math.random() * 96);
      arr[ix * 3] = this.player.x;
      arr[ix * 3 + 1] = this.player.y + 0.2;
      arr[ix * 3 + 2] = this.player.z;
      this.sparkVel[ix * 3] = (Math.random() - 0.5) * 6;
      this.sparkVel[ix * 3 + 1] = 2 + Math.random() * 4;
      this.sparkVel[ix * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    pos.needsUpdate = true;
  }

  private tickSparks(dt: number) {
    const pos = this.sparks.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < 96; i++) {
      arr[i * 3] += this.sparkVel[i * 3] * dt;
      arr[i * 3 + 1] += this.sparkVel[i * 3 + 1] * dt;
      arr[i * 3 + 2] += this.sparkVel[i * 3 + 2] * dt;
      this.sparkVel[i * 3 + 1] -= 12 * dt;
    }
    pos.needsUpdate = true;
  }

  private pushHud() {
    const course = courseById(this.opts.courseId);
    const def = carById(this.opts.carId);
    const n = this.track.data.samples.length - 1;
    const progress = Math.min(1, this.player.maxIdx / n);
    let pos: 1 | 2 | null = null;
    let rivalGap: number | null = null;
    if (this.rival) {
      pos = this.player.maxIdx >= this.rival.maxIdx ? 1 : 2;
      const ds =
        this.track.data.samples[this.player.sampleIdx].dist -
        this.track.data.samples[this.rival.sampleIdx].dist;
      rivalGap = ds;
    }
    const curv = Math.abs(
      this.track.data.samples[Math.min(n, this.player.sampleIdx + 12)]?.curv ?? 0,
    );
    const snap: HudSnap = {
      speed: Math.abs(this.player.speed) * 3.6,
      rpm: this.player.rpm,
      redline: def.redline,
      gear: this.player.gear,
      time: this.time,
      best: this.opts.mode === "time" ? (recordPeek(this.opts.courseId) ?? null) : null,
      progress,
      courseName: course.name,
      courseJp: course.nameJp,
      mode: this.opts.mode,
      countdown: this.go ? 0 : this.countdown,
      go: this.go,
      finished: this.finished,
      wrongWay:
        this.player.sampleIdx + 10 < this.player.maxIdx && Math.abs(this.player.speed) > 4,
      brakeWarn: curv > 0.09 && Math.abs(this.player.speed) > 18,
      drifting: this.player.drifting,
      driftScore: Math.round(this.driftScore),
      pos,
      rivalGap,
      camera: this.cameraMode,
      paused: this.paused,
    };
    this.opts.onHud(snap);
  }
}

function recordPeek(courseId: CourseId): number | undefined {
  try {
    const raw = localStorage.getItem("touge-zero-save-v1");
    if (!raw) return undefined;
    const data = JSON.parse(raw) as { best?: Record<string, number> };
    return data.best?.[courseId];
  } catch {
    return undefined;
  }
}
