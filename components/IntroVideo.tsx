function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&/]+)/,
    /youtube\.com\/watch\?(?:.*&)?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

interface Props {
  videoUrl: string;
}

export default function IntroVideo({ videoUrl }: Props) {
  const videoId = extractYouTubeId(videoUrl);
  if (!videoId) return null;

  return (
    <section className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg">
      <div className="px-6 pt-6 pb-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Osobna poruka</p>
        <h2 className="text-white font-bold text-lg leading-snug">Marko Srnec, osnivač PozicijaHR</h2>
      </div>
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title="Osobna poruka — Marko Srnec, osnivač PozicijaHR"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </section>
  );
}
