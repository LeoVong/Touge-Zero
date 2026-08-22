import type { Actions, CarDef, CarState, TrackData, TrackSample } from "./types";

export function yawFromTangent(tx: number, tz: number): number {
  return Math.atan2(-tx, -tz);
}

export function spawnState(track: TrackData, idx = 2): CarState {
  const s = track.samples[Math.min(idx, track.samples.length - 1)];
  return {
    x: s.x,
    y: s.y + 0.05,
    z: s.z,
    yaw: yawFromTangent(s.tx, s.tz),
    pitch: 0,
    roll: 0,
    speed: 0,
    latVel: 0,
    steerVis: 0,
    drifting: false,
    rpm: 900,
    gear: 1,
    sampleIdx: idx,
    maxIdx: idx,
    nextCp: 0,
    wallHit: 0,
    offGrip: 1,
  };
}

export function nearestIndex(samples: TrackSample[], x: number, z: number, hint: number): number {
  const n = samples.length;
  let best = Math.max(0, Math.min(n - 1, hint));
  let bestD = Infinity;
  const lo = Math.max(0, hint - 14);
  const hi = Math.min(n - 1, hint + 18);
  for (let i = lo; i <= hi; i++) {
    const dx = samples[i].x - x;
    const dz = samples[i].z - z;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (bestD > 400) {
    for (let i = 0; i < n; i += 4) {
      const dx = samples[i].x - x;
      const dz = samples[i].z - z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
  }
  return best;
}

export function lookAheadCurv(track: TrackData, idx: number, meters = 42): number {
  const samples = track.samples;
  const start = samples[idx];
  let max = 0;
  for (let i = idx; i < samples.length; i++) {
    if (samples[i].dist - start.dist > meters) break;
    max = Math.max(max, Math.abs(samples[i].curv));
  }
  return max;
}

export function stepCar(
  car: CarState,
  input: Actions,
  def: CarDef,
  track: TrackData,
  dt: number,
  locked: boolean,
): { wall: boolean; finished: boolean; wrongWay: boolean; brakeWarn: boolean } {
  const samples = track.samples;
  const maxMs = def.maxSpeed / 3.6;

  if (!locked) {
    if (input.throttle > 0) {
      const pull = 1 - Math.max(0, car.speed) / maxMs;
      car.speed += def.accel * input.throttle * Math.max(0.18, pull) * dt;
    }
    if (input.brake > 0) {
      car.speed -= def.brake * input.brake * dt;
    }
    const coast = input.throttle > 0.15 ? 0.22 : 1.15;
    car.speed *= 1 - 0.42 * def.weight * coast * dt;
    if (car.speed > maxMs) car.speed = maxMs;
    if (car.speed < -maxMs * 0.32) car.speed = -maxMs * 0.32;
  } else {
    car.speed *= 1 - 1.8 * dt;
  }

  const speedAbs = Math.abs(car.speed);
  const speedFactor = Math.min(1, speedAbs / 7);
  const taper = 1 / (1 + speedAbs * 0.038);
  const reverse = car.speed >= 0 ? 1 : -1;
  const wantDrift = input.drift && speedAbs > 8 && Math.abs(input.steer) > 0.12;
  car.drifting = wantDrift;

  const turnRate = 2.15 * def.turn;
  const driftYaw = wantDrift ? 1.28 : 1;
  car.yaw += input.steer * turnRate * speedFactor * taper * reverse * driftYaw * dt;

  const gripK = wantDrift ? 1.55 * def.driftEase : 8.4 * def.grip;
  if (wantDrift && Math.abs(input.steer) > 0.15) {
    car.latVel += -input.steer * speedAbs * 0.95 * def.driftEase * dt;
  }
  car.latVel *= Math.exp(-gripK * dt);

  const sHint = nearestIndex(samples, car.x, car.z, car.sampleIdx);
  const s = samples[sHint];
  const slope = -s.ty;
  car.speed += slope * 9.81 * 0.42 * dt;

  const fx = -Math.sin(car.yaw);
  const fz = -Math.cos(car.yaw);
  const rx = Math.cos(car.yaw);
  const rz = -Math.sin(car.yaw);

  car.x += (fx * car.speed + rx * car.latVel) * dt;
  car.z += (fz * car.speed + rz * car.latVel) * dt;

  const idx = nearestIndex(samples, car.x, car.z, sHint);
  car.sampleIdx = idx;
  const samp = samples[idx];
  const dx = car.x - samp.x;
  const dz = car.z - samp.z;
  const lat = dx * samp.rx + dz * samp.rz;
  const maxLat = samp.halfWidth - 0.9;
  let wall = false;
  if (Math.abs(lat) > maxLat) {
    const sign = Math.sign(lat) || 1;
    const corr = Math.abs(lat) - maxLat;
    car.x -= samp.rx * sign * corr;
    car.z -= samp.rz * sign * corr;
    car.latVel *= -0.28;
    car.speed *= 0.82;
    car.wallHit = 1;
    wall = true;
  }
  car.y = samp.y + 0.02;
  car.pitch += (Math.atan2(samp.ty, Math.hypot(samp.tx, samp.tz)) * 0.85 - car.pitch) * Math.min(1, 8 * dt);
  const wantRoll = -input.steer * 0.12 - car.latVel * 0.015;
  car.roll += (wantRoll - car.roll) * Math.min(1, 6 * dt);
  car.steerVis += (input.steer - car.steerVis) * Math.min(1, 10 * dt);
  car.wallHit = Math.max(0, car.wallHit - dt * 2.4);

  if (idx >= car.maxIdx) car.maxIdx = idx;
  const cps = track.checkpoints;
  while (car.nextCp < cps.length && idx >= cps[car.nextCp]) car.nextCp += 1;

  const finished = car.nextCp >= cps.length && idx >= samples.length - 5;
  const wrongWay = idx + 10 < car.maxIdx && speedAbs > 4;
  const curv = lookAheadCurv(track, idx, 38);
  const brakeWarn = curv > 0.085 && speedAbs > 18 && !input.brake;

  const ratio = [0, 3.1, 2.1, 1.45, 1.08, 0.86][Math.min(5, Math.max(1, car.gear))];
  const targetGear = Math.min(5, Math.max(1, 1 + Math.floor((speedAbs * 3.6) / 42)));
  if (targetGear > car.gear && car.rpm > def.redline * 0.72) car.gear = targetGear;
  if (targetGear < car.gear && car.rpm < def.redline * 0.28) car.gear = targetGear;
  const spin = (speedAbs / Math.max(0.2, maxMs)) * def.redline * (ratio / 1.45);
  const wantRpm = 800 + spin * (0.55 + 0.45 * input.throttle);
  car.rpm += (wantRpm - car.rpm) * Math.min(1, 6 * dt);
  car.rpm = Math.max(800, Math.min(def.redline + 400, car.rpm));

  return { wall, finished, wrongWay, brakeWarn };
}

export function respawn(car: CarState, track: TrackData): void {
  const idx = Math.max(0, Math.min(track.samples.length - 1, car.maxIdx - 4));
  const s = track.samples[idx];
  car.x = s.x;
  car.y = s.y + 0.05;
  car.z = s.z;
  car.yaw = yawFromTangent(s.tx, s.tz);
  car.speed = 8;
  car.latVel = 0;
  car.sampleIdx = idx;
  car.pitch = 0;
  car.roll = 0;
}
