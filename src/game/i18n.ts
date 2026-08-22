import type { Lang } from "./types";

const EN = {
  kicker: "ARCADE MOUNTAIN PASS",
  start: "START",
  howto: "HOW TO PLAY",
  back: "BACK",
  timeAttack: "TIME ATTACK",
  timeAttackSub: "Race the mountain. Beat the clock.",
  battle: "BATTLE",
  battleSub: "Catch the rival before the finish.",
  selectCourse: "SELECT COURSE",
  selectCar: "SELECT CAR",
  confirm: "CONFIRM",
  pause: "PAUSED",
  resume: "RESUME",
  retry: "RETRY",
  changeCar: "CHANGE CAR",
  title: "TITLE",
  finish: "FINISH",
  newRecord: "NEW RECORD",
  win: "WIN",
  lose: "LOSE",
  best: "BEST",
  time: "TIME",
  maxSpeed: "TOP",
  drift: "DRIFT",
  mute: "MUTE",
  unmute: "AUDIO",
  lang: "中文",
  howtoTitle: "THE PASS",
  howtoBody: [
    "Downhill only. No laps. Reach the finish as fast as you can.",
    "Steer with A/D or arrows. Hold W or ↑ to accelerate, S or ↓ to brake.",
    "Hold SPACE or SHIFT to drift. Turn in, keep the slide, release to grip.",
    "C cycles camera. R respawns at the last checkpoint. ESC pauses.",
    "On a pad: left stick steers, RT throttle, LT brake, A/X drift, Start pause.",
  ],
  brake: "BRAKE",
  wrongWay: "WRONG WAY",
  go: "GO",
  position: "POS",
  gap: "GAP",
  touchAccel: "ACCEL",
  touchBrake: "BRAKE",
  touchDrift: "DRIFT",
  insert: "PRESS START",
  disclaimer: "Original arcade touge racer.",
  nov: "NOVICE",
  int: "INTERMEDIATE",
  ext: "EXPERT",
  sector: "SECTOR",
};

const ZH: typeof EN = {
  kicker: "街機山路競速",
  start: "開始遊戲",
  howto: "操作說明",
  back: "返回",
  timeAttack: "計時挑戰",
  timeAttackSub: "下山競速，挑戰最佳成績。",
  battle: "競速對決",
  battleSub: "在終點前追上對手。",
  selectCourse: "選擇賽道",
  selectCar: "選擇車輛",
  confirm: "確認",
  pause: "暫停",
  resume: "繼續",
  retry: "再來一次",
  changeCar: "更換車輛",
  title: "標題畫面",
  finish: "完賽",
  newRecord: "新紀錄",
  win: "勝利",
  lose: "敗北",
  best: "最佳",
  time: "時間",
  maxSpeed: "極速",
  drift: "漂移",
  mute: "靜音",
  unmute: "音效",
  lang: "EN",
  howtoTitle: "峠",
  howtoBody: [
    "單向下山，沒有圈數。盡快衝過終點。",
    "A/D 或方向鍵轉向。W / ↑ 加速，S / ↓ 煞車。",
    "按住空格或 Shift 漂移。入彎、維持滑移、鬆手回抓地。",
    "C 切換視角。R 在檢查點重生。ESC 暫停。",
    "手把：左搖桿轉向，RT 油門，LT 煞車，A/X 漂移，Start 暫停。",
  ],
  brake: "煞車",
  wrongWay: "方向錯誤",
  go: "出發",
  position: "名次",
  gap: "差距",
  touchAccel: "油門",
  touchBrake: "煞車",
  touchDrift: "漂移",
  insert: "按下開始",
  disclaimer: "原創街機山路競速。",
  nov: "入門",
  int: "進階",
  ext: "專家",
  sector: "區間",
};

export type Copy = typeof EN;

export function t(lang: Lang): Copy {
  return lang === "zh" ? ZH : EN;
}

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "--'--\"---";
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  const whole = Math.floor(s);
  const ms = Math.floor((s - whole) * 1000);
  return `${String(m).padStart(2, "0")}'${String(whole).padStart(2, "0")}"${String(ms).padStart(3, "0")}`;
}
