import type { Actions } from "./types";

const GAME_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyC",
  "KeyR",
  "KeyP",
  "Escape",
  "Enter",
]);

function deadzone(x: number, y: number, dz = 0.18): { x: number; y: number } {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export class Input {
  keys = new Set<string>();
  touchSteer = 0;
  touchThrottle = 0;
  touchBrake = 0;
  touchDrift = false;
  qaSteer: number | null = null;
  qaThrottle: number | null = null;
  lastSteer = 0;
  private prevPause = false;
  private prevCam = false;
  private prevRespawn = false;
  private attached = false;

  private onDown = (e: KeyboardEvent) => {
    if (GAME_CODES.has(e.code)) e.preventDefault();
    this.keys.add(e.code);
  };
  private onUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private onBlur = () => {
    this.keys.clear();
  };

  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener("keydown", this.onDown);
    window.addEventListener("keyup", this.onUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onBlur);
  }

  detach() {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener("keydown", this.onDown);
    window.removeEventListener("keyup", this.onUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onBlur);
    this.keys.clear();
  }

  setKeys(codes: string[]) {
    this.keys.clear();
    for (const c of codes) this.keys.add(c);
  }

  poll(): Actions {
    let steer = 0;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) steer += 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) steer -= 1;

    let throttle = this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0;
    let brake = this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0;
    let drift = this.keys.has("Space") || this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");

    const pads = typeof navigator !== "undefined" ? navigator.getGamepads?.() : [];
    if (pads) {
      for (const pad of pads) {
        if (!pad || pad.mapping !== "standard") continue;
        const stick = deadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
        steer += -stick.x;
        const dpadL = pad.buttons[14]?.pressed ? 1 : 0;
        const dpadR = pad.buttons[15]?.pressed ? 1 : 0;
        steer += dpadL - dpadR;
        const rt = pad.buttons[7]?.value ?? 0;
        const lt = pad.buttons[6]?.value ?? 0;
        throttle = Math.max(throttle, rt);
        brake = Math.max(brake, lt);
        if (pad.buttons[0]?.pressed || pad.buttons[2]?.pressed) drift = true;
      }
    }

    steer += this.touchSteer;
    throttle = Math.max(throttle, this.touchThrottle);
    brake = Math.max(brake, this.touchBrake);
    if (this.touchDrift) drift = true;

    if (this.qaSteer !== null) steer = this.qaSteer;
    if (this.qaThrottle !== null) throttle = this.qaThrottle;

    steer = Math.max(-1, Math.min(1, steer));
    this.lastSteer = steer;

    const pauseHeld =
      this.keys.has("Escape") ||
      this.keys.has("KeyP") ||
      !!pads?.some((p) => p?.buttons[9]?.pressed);
    const camHeld = this.keys.has("KeyC");
    const respawnHeld = this.keys.has("KeyR");

    const pausePressed = pauseHeld && !this.prevPause;
    const cameraPressed = camHeld && !this.prevCam;
    const respawnPressed = respawnHeld && !this.prevRespawn;
    this.prevPause = pauseHeld;
    this.prevCam = camHeld;
    this.prevRespawn = respawnHeld;

    return {
      throttle,
      brake,
      steer,
      drift,
      pausePressed,
      cameraPressed,
      respawnPressed,
    };
  }
}
