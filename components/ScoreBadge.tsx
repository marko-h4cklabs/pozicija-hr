import { getScoreLabel } from '@/lib/scoring';

interface Props {
  businessName: string;
  score: number;
}

const CX = 150;
const CY = 140;   // pivot / arc baseline
const R  = 112;   // arc radius
const NEEDLE_LEN  = 97;
const NEEDLE_TAIL = 14;

// Gradient x-extent matches arc endpoints exactly
const GRAD_X1 = CX - R;  // 38  (score 0, left)
const GRAD_X2 = CX + R;  // 262 (score 100, right)

// score 0 → 180° (left), score 100 → 0° (right), standard math convention
function scoreToAngle(s: number): number {
  return 180 - s * 1.8;
}

function pt(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) };
}

// sweep-flag 1 = clockwise in SVG (Y-down) → traces the TOP semicircle left→right
function arcD(fromScore: number, toScore: number, r: number): string {
  const s = pt(scoreToAngle(fromScore), r);
  const e = pt(scoreToAngle(toScore), r);
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function labelColor(score: number): string {
  if (score >= 81) return '#22c55e';
  if (score >= 66) return '#4ade80';
  if (score >= 41) return '#f97316';
  return '#ef4444';
}

export default function ScoreBadge({ businessName, score }: Props) {
  const label   = getScoreLabel(score);
  const clamped = Math.max(0, Math.min(100, score));
  const tip     = pt(scoreToAngle(clamped), NEEDLE_LEN);
  const tail    = pt(scoreToAngle(clamped) + 180, NEEDLE_TAIL);
  const color   = labelColor(clamped);
  const fullArc = arcD(0, 100, R);

  return (
    <div className="bg-[#0F172A] py-10 px-6 text-center">
      <h1 className="text-white text-3xl sm:text-4xl font-bold mb-4">{businessName}</h1>

      <div className="w-full max-w-[320px] sm:max-w-sm mx-auto">
        <svg
          viewBox="0 0 300 188"
          className="w-full"
          style={{ overflow: 'visible' }}
          aria-label={`Rezultat: ${score} od 100`}
        >
          <defs>
            {/*
              Horizontal gradient whose x-extent matches the arc endpoints.
              Because the arc is a perfect semicircle, a horizontal gradient
              maps linearly to score position.
            */}
            <linearGradient
              id="arcGrad"
              x1={GRAD_X1}
              y1="0"
              x2={GRAD_X2}
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%"   stopColor="#ef4444" />
              <stop offset="38%"  stopColor="#f97316" />
              <stop offset="62%"  stopColor="#facc15" />
              <stop offset="78%"  stopColor="#4ade80" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            {/* Glow: blur the arc and composite the sharp arc on top */}
            <filter id="arcGlow" x="-8%" y="-60%" width="116%" height="220%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle needle glow */}
            <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Track (dark channel behind the arc) ──────────────────── */}
          <path
            d={fullArc}
            fill="none"
            stroke="#0f2236"
            strokeWidth="9"
            strokeLinecap="butt"
          />
          {/* Inner dark ring to deepen the channel */}
          <path
            d={fullArc}
            fill="none"
            stroke="#162032"
            strokeWidth="6"
            strokeLinecap="butt"
          />

          {/* ── Gradient arc with glow ───────────────────────────────── */}
          <path
            d={fullArc}
            fill="none"
            stroke="url(#arcGrad)"
            strokeWidth="4.5"
            strokeLinecap="butt"
            filter="url(#arcGlow)"
          />

          {/* ── Needle ──────────────────────────────────────────────── */}
          {/* Tail (opposite side of pivot, subtle) */}
          <line
            x1={CX} y1={CY}
            x2={tail.x.toFixed(2)} y2={tail.y.toFixed(2)}
            stroke="#334155"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Main needle with subtle glow */}
          <line
            x1={CX} y1={CY}
            x2={tip.x.toFixed(2)} y2={tip.y.toFixed(2)}
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            filter="url(#needleGlow)"
          />

          {/* ── Pivot ───────────────────────────────────────────────── */}
          <circle cx={CX} cy={CY} r="5.5" fill="#1e293b" />
          <circle cx={CX} cy={CY} r="3"   fill="#94a3b8" />
          <circle cx={CX} cy={CY} r="1.5" fill="#cbd5e1" />

          {/* ── Score number ────────────────────────────────────────── */}
          <text
            x={CX}
            y={CY + 22}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="44"
            fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif"
            fontWeight="700"
            letterSpacing="-1"
          >
            {score}
          </text>

          {/* ── "od 100 bodova" ──────────────────────────────────────── */}
          <text
            x={CX}
            y={CY + 42}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#475569"
            fontSize="9"
            fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif"
            letterSpacing="0.5"
          >
            od 100 bodova
          </text>
        </svg>
      </div>

      <p className="font-semibold text-sm sm:text-base mt-2 text-center" style={{ color }}>
        {label}
      </p>
    </div>
  );
}
