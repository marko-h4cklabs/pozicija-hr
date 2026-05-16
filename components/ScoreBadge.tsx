import { getScoreLabel } from '@/lib/scoring';

interface Props {
  businessName: string;
  score: number;
}

// --- Gauge geometry constants ---
const CX = 150;   // SVG center x
const CY = 145;   // SVG center y (pivot point)
const R = 110;    // arc radius (centerline of stroke)
const TRACK_W = 16;
const NEEDLE_LEN = 94;
const R_LABEL = 132; // radius for scale labels

const ZONES = [
  { from: 0,  to: 40,  color: '#ef4444' },  // red
  { from: 40, to: 65,  color: '#f97316' },  // orange
  { from: 65, to: 80,  color: '#86efac' },  // light green
  { from: 80, to: 100, color: '#22c55e' },  // green
];

// Score 0 → 180° (left), score 100 → 0° (right), standard math angles
function scoreToAngle(s: number): number {
  return 180 - s * 1.8;
}

function pt(angleDeg: number, r: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) };
}

// Counter-clockwise in SVG (sweep=0) traces the top arc from left to right
function arc(fromScore: number, toScore: number, r: number): string {
  const s = pt(scoreToAngle(fromScore), r);
  const e = pt(scoreToAngle(toScore), r);
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 0 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

const SCALE_MARKS = [0, 25, 50, 75, 100];

function labelColor(score: number): string {
  if (score >= 81) return '#22c55e';
  if (score >= 66) return '#86efac';
  if (score >= 41) return '#f97316';
  return '#ef4444';
}

export default function ScoreBadge({ businessName, score }: Props) {
  const label = getScoreLabel(score);
  const clamped = Math.max(0, Math.min(100, score));
  const needleTip = pt(scoreToAngle(clamped), NEEDLE_LEN);
  const color = labelColor(clamped);

  return (
    <div className="bg-[#0F172A] py-10 px-6 text-center">
      <h1 className="text-white text-3xl sm:text-4xl font-bold mb-4">{businessName}</h1>

      <div className="w-full max-w-xs sm:max-w-sm mx-auto">
        <svg viewBox="0 0 300 185" className="w-full" aria-label={`Rezultat: ${score} od 100`}>

          {/* Dark background track */}
          <path
            d={arc(0, 100, R)}
            fill="none"
            stroke="#1e293b"
            strokeWidth={TRACK_W + 2}
            strokeLinecap="butt"
          />

          {/* Colored zone arcs */}
          {ZONES.map(({ from, to, color: c }) => (
            <path
              key={from}
              d={arc(from, to, R)}
              fill="none"
              stroke={c}
              strokeWidth={TRACK_W}
              strokeLinecap="butt"
            />
          ))}

          {/* Scale labels */}
          {SCALE_MARKS.map((s) => {
            const pos = pt(scoreToAngle(s), R_LABEL);
            return (
              <text
                key={s}
                x={pos.x.toFixed(2)}
                y={pos.y.toFixed(2)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#475569"
                fontSize="9"
                fontFamily="Helvetica, Arial, sans-serif"
              >
                {s}
              </text>
            );
          })}

          {/* Needle */}
          <line
            x1={CX}
            y1={CY}
            x2={needleTip.x.toFixed(2)}
            y2={needleTip.y.toFixed(2)}
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Pivot: white ring with dark centre */}
          <circle cx={CX} cy={CY} r="6" fill="white" />
          <circle cx={CX} cy={CY} r="3" fill="#0F172A" />

          {/* Score number */}
          <text
            x={CX}
            y={CY + 18}
            textAnchor="middle"
            dominantBaseline="hanging"
            fill="white"
            fontSize="32"
            fontFamily="Helvetica, Arial, sans-serif"
            fontWeight="bold"
          >
            {score}
          </text>

          {/* "od 100 bodova" */}
          <text
            x={CX}
            y={CY + 53}
            textAnchor="middle"
            dominantBaseline="hanging"
            fill="#64748b"
            fontSize="9"
            fontFamily="Helvetica, Arial, sans-serif"
          >
            od 100 bodova
          </text>

        </svg>
      </div>

      <p className="font-semibold text-base sm:text-lg mt-1" style={{ color }}>
        {label}
      </p>
    </div>
  );
}
