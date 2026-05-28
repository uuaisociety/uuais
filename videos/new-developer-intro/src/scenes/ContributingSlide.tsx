import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

const items = [
  { icon: "🔀", text: "Branch: feature/*, fix/*, docs/*" },
  { icon: "✅", text: "Run npm run lint before PR" },
  { icon: "📐", text: "Match existing code style" },
  { icon: "📘", text: "Update docs if needed" },
];

export const ContributingSlide: React.FC = () => {
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
          Contributing
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          {items.map((item, i) => {
            const itemDelay = 40 + i * 30;
            const itemOpacity = interpolate(frame, [itemDelay, itemDelay + 20], [0, 1], {
              extrapolateRight: "clamp",
            });
            const itemScale = interpolate(frame, [itemDelay, itemDelay + 20], [0.9, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={item.icon}
                style={{
                  opacity: itemOpacity,
                  transform: `scale(${itemScale})`,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontSize: 16,
                  color: "#d1d5db",
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            );
          })}
        </div>
        <p
          style={{
            fontSize: 13,
            color: "#6b7280",
            marginTop: 50,
          }}
        >
          README has full details & Firebase setup guide
        </p>
      </div>
    </AbsoluteFill>
  );
};
