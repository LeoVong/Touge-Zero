import { create } from "zustand";
import type { CameraMode, CarId, CourseId, GameMode, HudSnap, Lang, RaceResult, Screen } from "./types";
import { loadSave, writeSave, type SaveData } from "./save";

const save = loadSave();

export const emptyHud: HudSnap = {
  speed: 0,
  rpm: 800,
  redline: 7800,
  gear: 1,
  time: 0,
  best: null,
  progress: 0,
  courseName: "",
  courseJp: "",
  mode: "time",
  countdown: 3,
  go: false,
  finished: false,
  wrongWay: false,
  brakeWarn: false,
  drifting: false,
  driftScore: 0,
  pos: null,
  rivalGap: null,
  camera: "chase",
  paused: false,
};

type UI = {
  screen: Screen;
  lang: Lang;
  muted: boolean;
  shake: boolean;
  mode: GameMode;
  courseId: CourseId;
  carId: CarId;
  result: RaceResult | null;
  best: SaveData["best"];
  paused: boolean;
  setScreen: (s: Screen) => void;
  setLang: (l: Lang) => void;
  toggleMute: () => void;
  setMode: (m: GameMode) => void;
  setCourse: (id: CourseId) => void;
  setCar: (id: CarId) => void;
  setResult: (r: RaceResult | null) => void;
  setPaused: (p: boolean) => void;
  persist: () => void;
};

function persistNow(part: Partial<SaveData>) {
  const cur = loadSave();
  writeSave({ ...cur, ...part });
}

export const useGameUI = create<UI>((set, get) => ({
  screen: "title",
  lang: save.lang,
  muted: save.muted,
  shake: save.shake,
  mode: "time",
  courseId: save.lastCourse,
  carId: save.lastCar,
  result: null,
  best: save.best,
  paused: false,
  setScreen: (screen) => set({ screen, paused: screen === "race" ? get().paused : false }),
  setLang: (lang) => {
    set({ lang });
    persistNow({ lang });
  },
  toggleMute: () => {
    const muted = !get().muted;
    set({ muted });
    persistNow({ muted });
  },
  setMode: (mode) => set({ mode }),
  setCourse: (courseId) => {
    set({ courseId });
    persistNow({ lastCourse: courseId });
  },
  setCar: (carId) => {
    set({ carId });
    persistNow({ lastCar: carId });
  },
  setResult: (result) => {
    set({ result });
    if (result?.isRecord) {
      const best = { ...get().best, [result.courseId]: result.time };
      set({ best });
    }
  },
  setPaused: (paused) => set({ paused }),
  persist: () => {
    const s = get();
    persistNow({ lang: s.lang, muted: s.muted, lastCar: s.carId, lastCourse: s.courseId });
  },
}));

export const useHud = create<{ snap: HudSnap; setSnap: (s: HudSnap) => void }>((set) => ({
  snap: emptyHud,
  setSnap: (snap) => set({ snap }),
}));
