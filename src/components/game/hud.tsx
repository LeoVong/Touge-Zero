import { useMemo } from "react";
import { courseById, coursePlan } from "@/game/courses";
import { formatTime, t } from "@/game/i18n";
import { useGameUI, useHud } from "@/game/store";
import type { CourseId } from "@/game/types";

function Tacho({ rpm, redline, gear, speed }: { rpm: number; redline: number; gear: number; speed: number }) {
  const frac = Math.min(1, rpm / redline);
  const ang = -120 + frac * 240;
  const red = frac > 0.86;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <circle cx="60" cy="60" r="52" fill="none" stroke="color-mix(in oklab, var(--color-fg) 14%, transparent)" strokeWidth="6" />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke={red ? "var(--color-accent)" : "var(--color-fg)"}
          strokeWidth="6"
          strokeDasharray={`${frac * 327} 327`}
          strokeLinecap="butt"
          transform="rotate(-120 60 60)"
        />
        <line
          x1="60"
          y1="60"
          x2={60 + Math.cos(((ang - 90) * Math.PI) / 180) * 40}
          y2={60 + Math.sin(((ang - 90) * Math.PI) / 180) * 40}
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="60" cy="60" r="3.5" fill="var(--color-fg)" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <div className="font-display text-3xl font-semibold tabular-nums leading-none text-fg">
          {Math.round(speed)}
        </div>
        <div className="text-[10px] tracking-[0.2em] text-muted">KM/H</div>
        <div className="font-display text-lg tabular-nums text-fg">{gear}</div>
      </div>
    </div>
  );
}

function MiniMap({ courseId, progress }: { courseId: CourseId; progress: number }) {
  const plan = useMemo(() => coursePlan(courseById(courseId)), [courseId]);
  const box = useMemo(() => {
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const p of plan) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
    return { minX, maxX, minZ, maxZ };
  }, [plan]);
  const pad = 8;
  const w = 120;
  const h = 160;
  const sx = (w - pad * 2) / Math.max(1, box.maxX - box.minX);
  const sz = (h - pad * 2) / Math.max(1, box.maxZ - box.minZ);
  const s = Math.min(sx, sz);
  const d = plan
    .map((p, i) => {
      const x = pad + (p.x - box.minX) * s;
      const y = pad + (p.z - box.minZ) * s;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const idx = Math.min(plan.length - 1, Math.floor(progress * (plan.length - 1)));
  const px = pad + (plan[idx].x - box.minX) * s;
  const py = pad + (plan[idx].z - box.minZ) * s;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-28 opacity-90">
      <path d={d} fill="none" stroke="color-mix(in oklab, var(--color-fg) 28%, transparent)" strokeWidth="3" />
      <path d={d} fill="none" stroke="var(--color-fg)" strokeWidth="1.2" />
      <circle cx={px} cy={py} r="3.2" fill="var(--color-accent)" />
    </svg>
  );
}

export function Hud() {
  const snap = useHud((s) => s.snap);
  const lang = useGameUI((s) => s.lang);
  const courseId = useGameUI((s) => s.courseId);
  const copy = t(lang);
  if (!snap.courseName && snap.countdown === 3 && !snap.go) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-fg">
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3">
        <div className="rounded-md border border-border bg-bg/70 px-3 py-2 backdrop-blur-sm">
          <div className="font-display text-xl tracking-wide">{snap.courseName}</div>
          <div className="text-[11px] text-muted">{snap.courseJp}</div>
          <div className="mt-1 h-1 w-36 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-fg" style={{ width: `${Math.round(snap.progress * 100)}%` }} />
          </div>
        </div>
        <div className="text-center">
          <div className="font-display text-[11px] tracking-[0.25em] text-muted">{copy.time}</div>
          <div className="font-display text-4xl font-semibold tabular-nums leading-none">{formatTime(snap.time)}</div>
          {snap.best != null && (
            <div className="mt-1 text-[11px] text-muted">
              {copy.best} {formatTime(snap.best)}
            </div>
          )}
        </div>
        <div className="hidden rounded-md border border-border bg-bg/70 px-3 py-2 text-right backdrop-blur-sm sm:block">
          {snap.pos != null && (
            <div className="font-display text-3xl tabular-nums">
              {snap.pos}
              <span className="text-base text-muted">/2</span>
            </div>
          )}
          <div className="text-[11px] tracking-[0.2em] text-muted">{snap.mode === "battle" ? copy.battle : copy.timeAttack}</div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 hidden sm:block">
        <MiniMap courseId={courseId} progress={snap.progress} />
      </div>

      <div className="absolute right-4 bottom-28 flex items-end gap-3 sm:bottom-4">
        {snap.drifting && (
          <div className="mb-4 font-display text-sm tracking-[0.3em] text-accent">{copy.drift}</div>
        )}
        <Tacho rpm={snap.rpm} redline={snap.redline} gear={snap.gear} speed={snap.speed} />
      </div>

      {!snap.go && !snap.finished && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="font-display text-8xl font-semibold tracking-widest">
            {snap.countdown > 0 ? snap.countdown : copy.go}
          </div>
        </div>
      )}

      {snap.brakeWarn && snap.go && !snap.finished && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 font-display text-4xl tracking-[0.35em] text-accent">
          {copy.brake}
        </div>
      )}
      {snap.wrongWay && (
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 font-display text-2xl tracking-[0.25em] text-accent">
          {copy.wrongWay}
        </div>
      )}
    </div>
  );
}
