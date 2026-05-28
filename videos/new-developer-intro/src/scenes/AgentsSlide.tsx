import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

const items = [
  "Read AGENTS.md + CLAUDE.md first",
  "AppContext is the single source of truth",
  "npm run lint before every PR",
  "Use browser-use for UI testing",
  "Check MEMORY.md for memory workflow",
];

export const AgentsSlide: React.FC = () => {
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
          Using AI Agents
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          {items.map((text, i) => {
            const itemDelay = 40 + i * 28;
            const itemOpacity = interpolate(frame, [itemDelay, itemDelay + 20], [0, 1], {
              extrapolateRight: "clamp",
            });
            const itemX = interpolate(frame, [itemDelay, itemDelay + 20], [-30, 0], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={text}
                style={{
                  opacity: itemOpacity,
                  transform: `translateX(${itemX}px)`,
                  background: "rgba(31,41,55,0.8)",
                  borderRadius: 10,
                  padding: "12px 28px",
                  width: "100%",
                  maxWidth: 520,
                  fontSize: 18,
                  fontWeight: 500,
                  color: "#d1d5db",
                  textAlign: "left",
                  borderLeft: "3px solid #dc2626",
                }}
              >
                {text}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
