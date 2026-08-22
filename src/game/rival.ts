import type { CarDef, CarState, TrackData } from "./types";
import { spawnState, yawFromTangent } from "./physics";

export function makeRival(track: TrackData, ahead = 18): CarState {
  return spawnState(track, Math.min(track.samples.length - 10, ahead));
}

export function stepRival(ai: CarState, def: CarDef, track: TrackData, dt: number, skill = 0.9): void {
  const samples = track.samples;
  const idx = Math.min(samples.length - 1, Math.max(0, ai.sampleIdx));
  const look = samples[Math.min(samples.length - 1, idx + 10)];
  const here = samples[idx];
  const curv = Math.abs(look.curv);
  const maxMs = (def.maxSpeed / 3.6) * skill;
  const slow = 1 / (1 + curv * 16);
  const target = Math.max(9, maxMs * slow * 0.9);
  ai.speed += (target - ai.speed) * Math.min(1, 2.4 * dt);
  ai.speed *= 1 - 0.08 * dt;

  const step = ai.speed * dt;
  let dist = here.dist + step;
  if (dist >= track.length) {
    ai.sampleIdx = samples.length - 1;
    const s = samples[ai.sampleIdx];
    ai.x = s.x;
    ai.y = s.y + 0.05;
    ai.z = s.z;
    return;
  }
  let next = idx;
  while (next < samples.length - 1 && samples[next].dist < dist) next++;
  ai.sampleIdx = next;
  const s = samples[next];
  const inside = Math.sign(-s.curv || 1) * 0.35;
  ai.x = s.x + s.rx * inside;
  ai.y = s.y + 0.05;
  ai.z = s.z + s.rz * inside;
  ai.yaw = yawFromTangent(s.tx, s.tz);
  ai.maxIdx = Math.max(ai.maxIdx, next);
  const ratio = 1 + Math.floor((ai.speed * 3.6) / 42);
  ai.gear = Math.min(5, Math.max(1, ratio));
  ai.rpm = 1200 + (ai.speed / maxMs) * def.redline * 0.7;
}
