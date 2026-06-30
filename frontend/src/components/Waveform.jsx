export default function Waveform({ color = "var(--color-indigo)", bars = 5, height = 20 }) {
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="wave-bar w-1 rounded-full"
          style={{
            background: color,
            height: "100%",
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}
