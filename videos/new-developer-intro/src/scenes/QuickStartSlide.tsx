import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

const steps = [
  { label: "01", text: "Clone the repository" },
  { label: "02", text: "Copy .env.example → .env" },
  { label: "03", text: "npm install" },
  { label: "04", text: "npm run dev" },
];

export const QuickStartSlide: React.FC = () => {
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
          Quick Start
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          {steps.map((step, i) => {
            const itemDelay = 40 + i * 30;
            const itemOpacity = interpolate(frame, [itemDelay, itemDelay + 20], [0, 1], {
              extrapolateRight: "clamp",
            });
            const itemX = interpolate(frame, [itemDelay, itemDelay + 20], [40, 0], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={step.label}
                style={{
                  opacity: itemOpacity,
                  transform: `translateX(${itemX}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  background: "rgba(31,41,55,0.8)",
                  borderRadius: 12,
                  padding: "14px 28px",
                  width: "100%",
                  maxWidth: 480,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#dc2626",
                    minWidth: 24,
                  }}
                >
                  {step.label}
                </span>
                <code
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#f9fafb",
                    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                  }}
                >
                  {step.text}
                </code>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
