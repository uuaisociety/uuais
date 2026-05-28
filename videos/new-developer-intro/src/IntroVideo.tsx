import { AbsoluteFill, Sequence } from "remotion";
import { TitleSlide } from "./scenes/TitleSlide";
import { TechStackSlide } from "./scenes/TechStackSlide";
import { QuickStartSlide } from "./scenes/QuickStartSlide";
import { ScriptsSlide } from "./scenes/ScriptsSlide";
import { ContributingSlide } from "./scenes/ContributingSlide";
import { AgentsSlide } from "./scenes/AgentsSlide";

const SCENE_DURATION = 100;

export const IntroVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#111827" }}>
      <Sequence from={0} durationInFrames={SCENE_DURATION}>
        <TitleSlide />
      </Sequence>
      <Sequence from={SCENE_DURATION} durationInFrames={SCENE_DURATION}>
        <TechStackSlide />
      </Sequence>
      <Sequence from={SCENE_DURATION * 2} durationInFrames={SCENE_DURATION}>
        <QuickStartSlide />
      </Sequence>
      <Sequence from={SCENE_DURATION * 3} durationInFrames={SCENE_DURATION}>
        <ScriptsSlide />
      </Sequence>
      <Sequence from={SCENE_DURATION * 4} durationInFrames={SCENE_DURATION}>
        <ContributingSlide />
      </Sequence>
      <Sequence from={SCENE_DURATION * 5} durationInFrames={SCENE_DURATION}>
        <AgentsSlide />
      </Sequence>
    </AbsoluteFill>
  );
};
