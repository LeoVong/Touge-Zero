export type Lang = "en" | "zh";
export type GameMode = "time" | "battle";
export type Screen = "title" | "mode" | "course" | "car" | "howto" | "race" | "results";
export type CameraMode = "chase" | "hood" | "wide";

export type CarId = "koma" | "ryse" | "kuro" | "enrei";
export type CourseId = "kamui" | "amagiri" | "kuzure";

export type CarDef = {
  id: CarId;
  name: string;
  nameJp: string;
  class: string;
  drivetrain: "FR" | "AWD";
  color: number;
  accent: number;
  image: string;
  maxSpeed: number;
  accel: number;
  brake: number;
  grip: number;
  turn: number;
  driftEase: number;
  weight: number;
  redline: number;
  length: number;
  width: number;
  height: number;
};

export type Seg = { t: "s"; l: number } | { t: "c"; deg: number; r: number };

export type CourseDef = {
  id: CourseId;
  name: string;
  nameJp: string;
  grade: "NOV" | "INT" | "EXT";
  lengthLabel: string;
  image: string;
  startY: number;
  endY: number;
  halfWidth: number;
  fog: number;
  lampSpacing: number;
  treeSpacing: number;
  cliff: "none" | "left" | "right";
  segs: Seg[];
};

export type TrackSample = {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  rx: number;
  ry: number;
  rz: number;
  ux: number;
  uy: number;
  uz: number;
  dist: number;
  t: number;
  halfWidth: number;
  curv: number;
};

export type TrackData = {
  samples: TrackSample[];
  length: number;
  checkpoints: number[];
  halfWidth: number;
};

export type Actions = {
  throttle: number;
  brake: number;
  steer: number;
  drift: boolean;
  pausePressed: boolean;
  cameraPressed: boolean;
  respawnPressed: boolean;
};

export type CarState = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  speed: number;
  latVel: number;
  steerVis: number;
  drifting: boolean;
  rpm: number;
  gear: number;
  sampleIdx: number;
  maxIdx: number;
  nextCp: number;
  wallHit: number;
  offGrip: number;
};

export type RaceResult = {
  mode: GameMode;
  courseId: CourseId;
  carId: CarId;
  time: number;
  best: number | null;
  isRecord: boolean;
  won: boolean | null;
  rivalTime: number | null;
  maxSpeed: number;
  driftScore: number;
};

export type HudSnap = {
  speed: number;
  rpm: number;
  redline: number;
  gear: number;
  time: number;
  best: number | null;
  progress: number;
  courseName: string;
  courseJp: string;
  mode: GameMode;
  countdown: number;
  go: boolean;
  finished: boolean;
  wrongWay: boolean;
  brakeWarn: boolean;
  drifting: boolean;
  driftScore: number;
  pos: 1 | 2 | null;
  rivalGap: number | null;
  camera: CameraMode;
  paused: boolean;
};

export const FIXED_DT = 1 / 60;
