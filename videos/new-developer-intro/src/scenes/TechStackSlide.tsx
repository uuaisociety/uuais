import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

const techs = [
  { name: "Next.js", desc: "React Framework", color: "#ffffff" },
  { name: "TypeScript", desc: "Type Safety", color: "#3178c6" },
  { name: "Tailwind CSS", desc: "Utility-first Styling", color: "#06b6d4" },
  { name: "Firebase", desc: "Backend & Auth", color: "#f97316" },
];

export const TechStackSlide: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const headerY = interpolate(frame, [0, 30], [20, 0], { extrapolateRight: "clamp" });

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
          width: "85%",
        }}
      >
        <h2
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#f9fafb",
            opacity: headerOpacity,
            transform: `translateY(${headerY}px)`,
            margin: "0 0 48px 0",
          }}
        >
          Tech Stack
        </h2>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
          {techs.map((tech, i) => {
            const itemDelay = 40 + i * 24;
            const itemOpacity = interpolate(frame, [itemDelay, itemDelay + 20], [0, 1], {
              extrapolateRight: "clamp",
            });
            const itemY = interpolate(frame, [itemDelay, itemDelay + 20], [30, 0], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={tech.name}
                style={{
                  opacity: itemOpacity,
                  transform: `translateY(${itemY}px)`,
                  background: "rgba(31,41,55,0.8)",
                  border: "1px solid rgba(55,65,81,0.8)",
                  borderRadius: 16,
                  padding: "28px 32px",
                  minWidth: 180,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: tech.color,
                    marginBottom: 8,
                  }}
                >
                  {tech.name}
                </div>
                <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>
                  {tech.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
