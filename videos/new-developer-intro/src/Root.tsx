import "./index.css";
import { Composition } from "remotion";
import { IntroVideo } from "./IntroVideo";

const SCENE_DURATION = 200;
const TOTAL_DURATION = SCENE_DURATION * 6;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="IntroVideo"
        component={IntroVideo}
        durationInFrames={TOTAL_DURATION}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
