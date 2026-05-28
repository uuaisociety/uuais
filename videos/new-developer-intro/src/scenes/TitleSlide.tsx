import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

const gradient = "linear-gradient(135deg, #dc2626, #f87171)";

export const TitleSlide: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 40], [40, 0], { extrapolateRight: "clamp" });

  const subOpacity = interpolate(frame, [50, 90], [0, 1], { extrapolateRight: "clamp" });

  const tagOpacity = interpolate(frame, [100, 140], [0, 1], { extrapolateRight: "clamp" });

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
          transform: "translate(-50%, -60%)",
          textAlign: "center",
          width: "80%",
        }}
      >
        <h1
          style={{
            fontSize: 80,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            background: gradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: 0,
          }}
        >
          UUAIS
        </h1>
        <p
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: "#d1d5db",
            opacity: subOpacity,
            margin: "16px 0 0 0",
          }}
        >
          UU AI Society
        </p>
        <p
          style={{
            fontSize: 16,
            fontWeight: 400,
            color: "#9ca3af",
            opacity: tagOpacity,
            margin: "40px 0 0 0",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          New Developer Guide
        </p>
      </div>
    </AbsoluteFill>
  );
};
