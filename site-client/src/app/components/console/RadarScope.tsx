// ══════════════════════════════════════════════════════════════════
// КОНСОЛЬ: РАДАР — анимированный экран радара с развёрткой и целями
// Используется внутри MonitoringConsole (хиро главной страницы)
// ══════════════════════════════════════════════════════════════════

export function RadarScope() {
  return (
    <div className="relative w-full aspect-square max-w-[200px] md:max-w-[260px] mx-auto">
      {[100, 72, 44].map((size) => (
        <div
          key={size}
          className="absolute rounded-full"
          style={{ width: `${size}%`, height: `${size}%`, top: `${(100 - size) / 2}%`, left: `${(100 - size) / 2}%`, border: "1px solid rgba(65,217,232,0.22)" }}
        />
      ))}
      <div className="absolute top-0 left-1/2 w-px h-full" style={{ background: "rgba(65,217,232,0.14)" }} />
      <div className="absolute left-0 top-1/2 h-px w-full" style={{ background: "rgba(65,217,232,0.14)" }} />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, transparent 0deg, rgba(65,217,232,0.08) 35deg, rgba(65,217,232,0.5) 90deg, transparent 90deg)",
          animation: "sweep 4.5s linear infinite",
          maskImage: "radial-gradient(circle, black 99%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(circle, black 99%, transparent 100%)",
        }}
      />
      {[
        { top: "26%", left: "62%", delay: "0s", color: "#ff7a1a" },
        { top: "58%", left: "30%", delay: "1.4s", color: "#41d9e8" },
        { top: "70%", left: "66%", delay: "2.6s", color: "#ff4d4f" },
      ].map((b, i) => (
        <span key={i} className="absolute w-2 h-2 rounded-full" style={{ top: b.top, left: b.left, background: b.color, boxShadow: `0 0 10px ${b.color}`, animation: `blip 2.8s ease-in-out ${b.delay} infinite` }} />
      ))}
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: "#41d9e8" }} />
    </div>
  );
}
