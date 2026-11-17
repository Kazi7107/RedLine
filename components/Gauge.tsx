import { gaugeAngle } from "@/lib/view";
import { Icon } from "./Icon";

/** Score at or under this sits in the gauge's red zone (the "Risky" band). */
const RED_ZONE = 40;
const ARC = "M10 60 A50 50 0 0 1 110 60";

/** Tachometer-style reliability gauge. The needle sweeps in when it scrolls into view. */
export function Gauge({ score, isRisk, size = 120, animate = true }: { score: number; isRisk: boolean; size?: number; animate?: boolean }) {
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const a = (Math.PI * (180 - i * 18)) / 180;
    const r1 = 40;
    const r2 = i % 5 === 0 ? 33 : 36;
    return { x1: 60 + r1 * Math.cos(a), y1: 60 - r1 * Math.sin(a), x2: 60 + r2 * Math.cos(a), y2: 60 - r2 * Math.sin(a) };
  });
  return (
    <svg
      className={`gauge${isRisk ? " gauge--risk" : ""}`}
      width={size}
      height={size * 0.6}
      viewBox="0 0 120 70"
      role="img"
      aria-label={`Reliability ${score} out of 100`}
      data-animate={animate ? "" : undefined}
      style={{ ["--angle" as string]: `${gaugeAngle(score)}deg`, ["--fill" as string]: score }}
    >
      <path className="gauge__track" d={ARC} />
      <path className="gauge__zone" d={ARC} pathLength={100} strokeDasharray={`${RED_ZONE} 100`} />
      <path className="gauge__value" d={ARC} pathLength={100} />
      {ticks.map((t, i) => (
        <line key={i} className="gauge__tick" x1={t.x1.toFixed(2)} y1={t.y1.toFixed(2)} x2={t.x2.toFixed(2)} y2={t.y2.toFixed(2)} />
      ))}
      <line className="gauge__needle" x1="60" y1="60" x2="60" y2="20" />
      <circle className="gauge__hub" cx="60" cy="60" r="4.5" />
    </svg>
  );
}

export function GaugeBlock({
  score,
  label,
  isRisk,
  sub,
  source,
  size = 120,
}: {
  score: number;
  label: string;
  isRisk: boolean;
  sub?: string;
  source?: React.ReactNode;
  size?: number;
}) {
  return (
    <div className="gauge-block">
      <Gauge score={score} isRisk={isRisk} size={size} />
      <div className="gauge-block__text">
        <span className="gauge-block__label">
          Reliability {source}
        </span>
        <span className="gauge-block__score">
          <span className={`num${isRisk ? " is-risk" : ""}`}>{score}</span>
          <span className="gauge-block__band">
            {isRisk && <Icon name="alert" size={14} style={{ color: "var(--red-text)" }} />}
            {label}
          </span>
        </span>
        {sub && <span className="gauge-block__sub">{sub}</span>}
      </div>
    </div>
  );
}
