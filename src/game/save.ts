import type { CarId, CourseId, Lang } from "./types";

const KEY = "touge-zero-save-v1";
const VERSION = 1;

export type SaveData = {
  version: number;
  lang: Lang;
  muted: boolean;
  shake: boolean;
  best: Partial<Record<CourseId, number>>;
  lastCar: CarId;
  lastCourse: CourseId;
};

const DEFAULTS: SaveData = {
  version: VERSION,
  lang: "en",
  muted: false,
  shake: true,
  best: {},
  lastCar: "koma",
  lastCourse: "kamui",
};

function migrate(raw: SaveData): SaveData {
  return { ...DEFAULTS, ...raw, version: VERSION, best: { ...DEFAULTS.best, ...raw.best } };
}

export function loadSave(): SaveData {
  try {
    if (typeof localStorage === "undefined") return { ...DEFAULTS, best: {} };
    const txt = localStorage.getItem(KEY);
    if (!txt) return { ...DEFAULTS, best: {} };
    const parsed = JSON.parse(txt) as SaveData;
    return migrate(parsed);
  } catch {
    return { ...DEFAULTS, best: {} };
  }
}

export function writeSave(data: SaveData): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: VERSION }));
  } catch {
    /* private mode / quota */
  }
}

export function recordBest(course: CourseId, time: number): { best: number; isRecord: boolean } {
  const save = loadSave();
  const prev = save.best[course];
  const isRecord = prev === undefined || time < prev;
  if (isRecord) {
    save.best[course] = time;
    writeSave(save);
  }
  return { best: isRecord ? time : (prev as number), isRecord };
}
