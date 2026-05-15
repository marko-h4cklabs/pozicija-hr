import { getScoreLabel, getScoreColor } from '@/lib/scoring';

interface Props {
  businessName: string;
  score: number;
}

export default function ScoreBadge({ businessName, score }: Props) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  const ringColor =
    color === 'green'
      ? 'border-green-500 text-green-500'
      : color === 'orange'
      ? 'border-orange-500 text-orange-500'
      : 'border-red-500 text-red-500';

  const bgColor =
    color === 'green'
      ? 'bg-green-50'
      : color === 'orange'
      ? 'bg-orange-50'
      : 'bg-red-50';

  return (
    <div className="bg-[#0F172A] py-12 px-6 text-center">
      <h1 className="text-white text-3xl sm:text-4xl font-bold mb-8">{businessName}</h1>
      <div
        className={`inline-flex items-center justify-center w-40 h-40 rounded-full border-8 ${ringColor} ${bgColor} mb-6`}
      >
        <span className={`text-5xl font-black ${ringColor.split(' ')[1]}`}>{score}</span>
      </div>
      <p className="text-slate-400 text-sm mb-2">od 100 bodova</p>
      <p
        className={`font-semibold text-lg ${
          color === 'green'
            ? 'text-green-400'
            : color === 'orange'
            ? 'text-orange-400'
            : 'text-red-400'
        }`}
      >
        {label}
      </p>
    </div>
  );
}
