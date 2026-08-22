import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useGameUI } from "@/game/store";
import { t } from "@/game/i18n";

type Props = {
  onSteer: (v: number) => void;
  onThrottle: (v: number) => void;
  onBrake: (v: number) => void;
  onDrift: (v: boolean) => void;
  onPause: () => void;
};

function HoldBtn({
  label,
  onHold,
  className,
}: {
  label: ReactNode;
  onHold: (v: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={
        "select-none rounded-lg border border-border bg-surface/80 font-display text-sm tracking-widest text-fg backdrop-blur-sm active:bg-fg active:text-bg " +
        (className ?? "")
      }
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
    >
      {label}
    </button>
  );
}

export function TouchControls({ onSteer, onThrottle, onBrake, onDrift, onPause }: Props) {
  const lang = useGameUI((s) => s.lang);
  const copy = t(lang);
  const left = useRef(false);
  const right = useRef(false);
  const emitSteer = () => onSteer((left.current ? 1 : 0) + (right.current ? -1 : 0));
  return (
    <div className="pointer-events-none absolute inset-0 z-20 md:pointer-events-none">
      <button
        type="button"
        className="pointer-events-auto absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface/80 text-fg backdrop-blur-sm md:hidden"
        onClick={onPause}
        aria-label={copy.pause}
      >
        <span className="block h-3.5 w-3.5 border-y-2 border-fg" />
      </button>
      <div className="pointer-events-auto absolute bottom-4 left-4 flex gap-2 md:hidden">
        <HoldBtn
          label={<ChevronLeft className="mx-auto h-7 w-7" />}
          className="h-16 w-16"
          onHold={(v) => {
            left.current = v;
            emitSteer();
          }}
        />
        <HoldBtn
          label={<ChevronRight className="mx-auto h-7 w-7" />}
          className="h-16 w-16"
          onHold={(v) => {
            right.current = v;
            emitSteer();
          }}
        />
      </div>
      <div className="pointer-events-auto absolute right-4 bottom-40 flex flex-col gap-2 md:hidden">
        <HoldBtn label={copy.touchDrift} className="h-12 w-20" onHold={onDrift} />
        <HoldBtn label={copy.touchBrake} className="h-12 w-20" onHold={(v) => onBrake(v ? 1 : 0)} />
        <HoldBtn label={copy.touchAccel} className="h-20 w-20" onHold={(v) => onThrottle(v ? 1 : 0)} />
      </div>
    </div>
  );
}
