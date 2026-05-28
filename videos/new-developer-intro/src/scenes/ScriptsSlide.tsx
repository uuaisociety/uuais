import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

const scripts = [
  { cmd: "npm run dev", desc: "Start dev server (Turbopack)" },
  { cmd: "npm run build", desc: "Production build" },
  { cmd: "npm run lint", desc: "Check code quality" },
  { cmd: "npm run set:admin", desc: "Manage admin users" },
];

export const ScriptsSlide: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#111827",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          width: "80%",
        }}
      >
        <h2
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#f9fafb",
            opacity: headerOpacity,
            margin: "0 0 48px 0",
          }}
        >
          Available Scripts
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          {scripts.map((script, i) => {
            const itemDelay = 40 + i * 30;
            const itemOpacity = interpolate(frame, [itemDelay, itemDelay + 20], [0, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={script.cmd}
                style={{
                  opacity: itemOpacity,
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  background: "rgba(31,41,55,0.8)",
                  borderRadius: 12,
                  padding: "16px 32px",
                  width: "100%",
                  maxWidth: 520,
                }}
              >
                <code
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: "#f87171",
                    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                    minWidth: 200,
                    textAlign: "left",
                  }}
                >
                  {script.cmd}
                </code>
                <span
                  style={{
                    fontSize: 14,
                    color: "#9ca3af",
                    fontWeight: 400,
                  }}
                >
                  {script.desc}
                </span>
              </div>
            );
          })}
        </div>
        <p
          style={{
            fontSize: 13,
            color: "#6b7280",
            marginTop: 40,
            fontStyle: "italic",
          }}
        >
          Prerequisites: Node.js 18+
        </p>
      </div>
    </AbsoluteFill>
  );
};
