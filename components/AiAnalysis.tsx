const SECTION_KEYS = [
  'PROCJENA IZGUBLJENOG PRIHODA',
  'ŠTO BI ODMAH TREBALI NAPRAVITI',
] as const;

function parseSections(text: string): Array<{ title: string; content: string }> {
  const result: Array<{ title: string; content: string }> = [];

  for (let i = 0; i < SECTION_KEYS.length; i++) {
    const title = SECTION_KEYS[i];
    const start = text.indexOf(title);
    if (start === -1) continue;

    const contentStart = start + title.length;
    const nextIdx = SECTION_KEYS.slice(i + 1).reduce((min, s) => {
      const idx = text.indexOf(s);
      return idx !== -1 && idx < min ? idx : min;
    }, text.length);

    result.push({ title, content: text.slice(contentStart, nextIdx).trim() });
  }

  if (result.length === 0) {
    result.push({ title: 'Analiza', content: text.trim() });
  }

  return result;
}

function Content({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim());
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const isBullet = /^[-•*]|\d+\./.test(line.trim());
        return (
          <p
            key={i}
            className={`text-slate-700 leading-relaxed ${isBullet ? 'pl-4' : ''}`}
          >
            {isBullet ? line.replace(/^[-•*]\s*/, '• ').replace(/^\d+\.\s*/, (m) => m) : line}
          </p>
        );
      })}
    </div>
  );
}

interface Props {
  analysis: string;
  businessName: string;
}

export default function AiAnalysis({ analysis, businessName }: Props) {
  const sections = parseSections(analysis);

  return (
    <div className="border-2 border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl" role="img" aria-label="analiza">📋</span>
        <div>
          <h3 className="text-white font-bold text-lg leading-none">Stručna analiza i preporuke</h3>
          <p className="text-slate-400 text-xs mt-0.5">Pripremljeno osobno za {businessName}</p>
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-slate-100">
        {sections.map(({ title, content }) => (
          <div key={title} className="px-6 py-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              {title}
            </p>
            <Content text={content} />
          </div>
        ))}
      </div>
    </div>
  );
}
