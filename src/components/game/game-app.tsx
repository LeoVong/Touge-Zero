import { useCallback, useEffect, useRef, useState } from "react";
import { CARS } from "@/game/cars";
import { COURSES } from "@/game/courses";
import { formatTime, t } from "@/game/i18n";
import { emptyHud, useGameUI, useHud } from "@/game/store";
import type { GameEngine } from "@/game/engine";
import type { CarId, CourseId, RaceResult } from "@/game/types";
import { Hud } from "./hud";
import { TouchControls } from "./touch-controls";

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"rounded-xl border border-border bg-surface/85 p-5 backdrop-blur-md " + (className ?? "")}>
      {children}
    </div>
  );
}

function PrimaryBtn({
  children,
  onClick,
  wide,
}: {
  children: React.ReactNode;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-md bg-fg px-6 py-3 font-display text-lg tracking-[0.18em] text-bg transition-transform duration-150 hover:opacity-90 active:scale-[0.98] " +
        (wide ? "w-full" : "")
      }
    >
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border bg-transparent px-5 py-3 font-display text-sm tracking-[0.18em] text-fg transition-colors hover:bg-surface-2"
    >
      {children}
    </button>
  );
}

function TitleScreen() {
  const copy = t(useGameUI((s) => s.lang));
  const setScreen = useGameUI((s) => s.setScreen);
  const lang = useGameUI((s) => s.lang);
  const setLang = useGameUI((s) => s.setLang);
  const muted = useGameUI((s) => s.muted);
  const toggleMute = useGameUI((s) => s.toggleMute);
  const best = useGameUI((s) => s.best);
  return (
    <div className="relative flex min-h-dvh flex-col justify-between overflow-hidden">
      <img
        src="/art/title.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover"
        crossOrigin="anonymous"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-bg/20" />
      <header className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="text-[11px] tracking-[0.35em] text-muted">{copy.kicker}</div>
        <div className="flex gap-2">
          <GhostBtn onClick={() => setLang(lang === "en" ? "zh" : "en")}>{copy.lang}</GhostBtn>
          <GhostBtn onClick={toggleMute}>{muted ? copy.unmute : copy.mute}</GhostBtn>
        </div>
      </header>
      <div className="relative z-10 px-6 pb-4">
        <div className="text-sm tracking-[0.4em] text-muted">峠 ZERO</div>
        <h1 className="font-display text-6xl font-semibold tracking-[0.08em] text-fg sm:text-8xl">TOUGE ZERO</h1>
        <p className="mt-3 max-w-md text-sm text-muted">{copy.disclaimer}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <PrimaryBtn onClick={() => setScreen("mode")}>{copy.start}</PrimaryBtn>
          <GhostBtn onClick={() => setScreen("howto")}>{copy.howto}</GhostBtn>
        </div>
      </div>
      <footer className="relative z-10 grid grid-cols-3 gap-px border-t border-border bg-bg/70 text-center">
        {COURSES.map((c) => (
          <div key={c.id} className="px-3 py-3">
            <div className="text-[10px] tracking-[0.2em] text-muted">{c.name}</div>
            <div className="font-display text-lg tabular-nums">
              {best[c.id] != null ? formatTime(best[c.id]!) : "--'--\"---"}
            </div>
          </div>
        ))}
      </footer>
    </div>
  );
}

function HowTo() {
  const copy = t(useGameUI((s) => s.lang));
  const setScreen = useGameUI((s) => s.setScreen);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <Panel className="max-w-lg">
        <div className="font-display text-3xl tracking-wide">{copy.howtoTitle}</div>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted">
          {copy.howtoBody.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="mt-6">
          <GhostBtn onClick={() => setScreen("title")}>{copy.back}</GhostBtn>
        </div>
      </Panel>
    </div>
  );
}

function ModeSelect() {
  const copy = t(useGameUI((s) => s.lang));
  const setScreen = useGameUI((s) => s.setScreen);
  const setMode = useGameUI((s) => s.setMode);
  return (
    <div className="flex min-h-dvh flex-col justify-center bg-bg px-4">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 font-display text-sm tracking-[0.3em] text-muted">{copy.kicker}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-xl border border-border bg-surface p-6 text-left transition-colors hover:border-fg"
            onClick={() => {
              setMode("time");
              setScreen("course");
            }}
          >
            <div className="font-display text-3xl">{copy.timeAttack}</div>
            <p className="mt-2 text-sm text-muted">{copy.timeAttackSub}</p>
          </button>
          <button
            type="button"
            className="rounded-xl border border-border bg-surface p-6 text-left transition-colors hover:border-fg"
            onClick={() => {
              setMode("battle");
              setScreen("course");
            }}
          >
            <div className="font-display text-3xl">{copy.battle}</div>
            <p className="mt-2 text-sm text-muted">{copy.battleSub}</p>
          </button>
        </div>
        <div className="mt-6">
          <GhostBtn onClick={() => setScreen("title")}>{copy.back}</GhostBtn>
        </div>
      </div>
    </div>
  );
}

function CourseSelect() {
  const copy = t(useGameUI((s) => s.lang));
  const setScreen = useGameUI((s) => s.setScreen);
  const setCourse = useGameUI((s) => s.setCourse);
  const selected = useGameUI((s) => s.courseId);
  const best = useGameUI((s) => s.best);
  const grade = { NOV: copy.nov, INT: copy.int, EXT: copy.ext };
  return (
    <div className="min-h-dvh bg-bg px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-3xl tracking-wide">{copy.selectCourse}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {COURSES.map((c) => {
            const on = selected === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCourse(c.id)}
                className={
                  "overflow-hidden rounded-xl border text-left transition-colors " +
                  (on ? "border-fg" : "border-border hover:border-muted")
                }
              >
                <img src={c.image} alt="" className="h-36 w-full object-cover" crossOrigin="anonymous" />
                <div className="bg-surface p-4">
                  <div className="text-[10px] tracking-[0.25em] text-muted">{grade[c.grade]}</div>
                  <div className="font-display text-2xl">{c.name}</div>
                  <div className="text-xs text-muted">{c.nameJp}</div>
                  <div className="mt-2 flex justify-between text-xs text-muted">
                    <span>{c.lengthLabel}</span>
                    <span className="tabular-nums">{best[c.id] ? formatTime(best[c.id]!) : "—"}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex gap-3">
          <GhostBtn onClick={() => setScreen("mode")}>{copy.back}</GhostBtn>
          <PrimaryBtn onClick={() => setScreen("car")}>{copy.confirm}</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function CarSelect() {
  const copy = t(useGameUI((s) => s.lang));
  const setScreen = useGameUI((s) => s.setScreen);
  const setCar = useGameUI((s) => s.setCar);
  const selected = useGameUI((s) => s.carId);
  return (
    <div className="min-h-dvh bg-bg px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-3xl tracking-wide">{copy.selectCar}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARS.map((car) => {
            const on = selected === car.id;
            return (
              <button
                key={car.id}
                type="button"
                onClick={() => setCar(car.id)}
                className={
                  "overflow-hidden rounded-xl border text-left transition-colors " +
                  (on ? "border-fg" : "border-border hover:border-muted")
                }
              >
                <img src={car.image} alt="" className="h-40 w-full object-cover" crossOrigin="anonymous" />
                <div className="bg-surface p-4">
                  <div className="text-[10px] tracking-[0.25em] text-muted">{car.class}</div>
                  <div className="font-display text-xl">{car.name}</div>
                  <div className="text-xs text-muted">{car.nameJp}</div>
                  <dl className="mt-3 grid grid-cols-2 gap-y-1 text-[11px] text-muted">
                    <dt>VMAX</dt>
                    <dd className="text-right tabular-nums text-fg">{car.maxSpeed}</dd>
                    <dt>GRIP</dt>
                    <dd className="text-right tabular-nums text-fg">{Math.round(car.grip * 100)}</dd>
                    <dt>TURN</dt>
                    <dd className="text-right tabular-nums text-fg">{Math.round(car.turn * 100)}</dd>
                    <dt>DRIFT</dt>
                    <dd className="text-right tabular-nums text-fg">{Math.round(car.driftEase * 100)}</dd>
                  </dl>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex gap-3">
          <GhostBtn onClick={() => setScreen("course")}>{copy.back}</GhostBtn>
          <PrimaryBtn onClick={() => setScreen("race")}>{copy.confirm}</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

function RaceView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const inputRef = useRef<GameEngine | null>(null);
  const copy = t(useGameUI((s) => s.lang));
  const courseId = useGameUI((s) => s.courseId);
  const carId = useGameUI((s) => s.carId);
  const mode = useGameUI((s) => s.mode);
  const muted = useGameUI((s) => s.muted);
  const paused = useGameUI((s) => s.paused);
  const setPaused = useGameUI((s) => s.setPaused);
  const setScreen = useGameUI((s) => s.setScreen);
  const setResult = useGameUI((s) => s.setResult);
  const setSnap = useHud((s) => s.setSnap);

  const onFinish = useCallback(
    (r: RaceResult) => {
      setResult(r);
      window.setTimeout(() => setScreen("results"), 900);
    },
    [setResult, setScreen],
  );

  const onPauseToggle = useCallback(() => {
    setPaused(!useGameUI.getState().paused);
  }, [setPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dead = false;
    let eng: GameEngine | null = null;
    void import("@/game/engine").then(({ GameEngine }) => {
      if (dead) return;
      eng = new GameEngine(canvas, {
        courseId,
        carId,
        mode,
        muted,
        shake: useGameUI.getState().shake,
        onHud: setSnap,
        onFinish,
        onPauseToggle,
      });
      engineRef.current = eng;
      inputRef.current = eng;
      eng.start();
    });
    return () => {
      dead = true;
      eng?.dispose();
      engineRef.current = null;
      setSnap(emptyHud);
    };
  }, [courseId, carId, mode, onFinish, onPauseToggle, setSnap]);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg" style={{ touchAction: "none" }}>
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      <Hud />
      <TouchControls
        onSteer={(v) => inputRef.current?.setTouchSteer(v)}
        onThrottle={(v) => inputRef.current?.setTouchThrottle(v)}
        onBrake={(v) => inputRef.current?.setTouchBrake(v)}
        onDrift={(v) => inputRef.current?.setTouchDrift(v)}
        onPause={onPauseToggle}
      />
      {paused && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/70">
          <Panel className="w-[min(92vw,22rem)] text-center">
            <div className="font-display text-3xl tracking-[0.2em]">{copy.pause}</div>
            <div className="mt-6 flex flex-col gap-2">
              <PrimaryBtn wide onClick={() => setPaused(false)}>
                {copy.resume}
              </PrimaryBtn>
              <GhostBtn
                onClick={() => {
                  setPaused(false);
                  setScreen("car");
                }}
              >
                {copy.changeCar}
              </GhostBtn>
              <GhostBtn
                onClick={() => {
                  setPaused(false);
                  setScreen("title");
                }}
              >
                {copy.title}
              </GhostBtn>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function Results() {
  const copy = t(useGameUI((s) => s.lang));
  const result = useGameUI((s) => s.result);
  const setScreen = useGameUI((s) => s.setScreen);
  if (!result) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <GhostBtn onClick={() => setScreen("title")}>{copy.title}</GhostBtn>
      </div>
    );
  }
  const headline =
    result.mode === "battle" ? (result.won ? copy.win : copy.lose) : result.isRecord ? copy.newRecord : copy.finish;
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-4">
      <img
        src="/art/title.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover opacity-30"
        crossOrigin="anonymous"
      />
      <div className="absolute inset-0 bg-bg/70" />
      <Panel className="relative w-[min(94vw,28rem)]">
        <div className="text-[11px] tracking-[0.3em] text-muted">{copy.kicker}</div>
        <div className="mt-1 font-display text-4xl tracking-wide">{headline}</div>
        <div className="mt-6 space-y-2 font-display text-lg tabular-nums">
          <Row label={copy.time} value={formatTime(result.time)} />
          <Row label={copy.best} value={result.best != null ? formatTime(result.best) : "—"} />
          <Row label={copy.maxSpeed} value={`${Math.round(result.maxSpeed)} km/h`} />
          <Row label={copy.drift} value={String(result.driftScore)} />
        </div>
        <div className="mt-8 flex flex-col gap-2">
          <PrimaryBtn wide onClick={() => setScreen("race")}>
            {copy.retry}
          </PrimaryBtn>
          <GhostBtn onClick={() => setScreen("car")}>{copy.changeCar}</GhostBtn>
          <GhostBtn onClick={() => setScreen("title")}>{copy.title}</GhostBtn>
        </div>
      </Panel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border py-2">
      <span className="text-xs tracking-[0.2em] text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function GameApp() {
  const screen = useGameUI((s) => s.screen);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.has("qa")) {
      useGameUI.getState().setCourse((q.get("course") as CourseId) || "kamui");
      useGameUI.getState().setCar((q.get("car") as CarId) || "koma");
      useGameUI.getState().setMode(q.get("mode") === "battle" ? "battle" : "time");
      useGameUI.getState().setScreen("race");
    }
  }, []);

  switch (screen) {
    case "howto":
      return <HowTo />;
    case "mode":
      return <ModeSelect />;
    case "course":
      return <CourseSelect />;
    case "car":
      return <CarSelect />;
    case "race":
      return <RaceView />;
    case "results":
      return <Results />;
    default:
      return <TitleScreen />;
  }
}
