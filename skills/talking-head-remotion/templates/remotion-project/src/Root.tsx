import {Composition, Folder} from "remotion";
import {demoProject} from "./demoData";
import {StudioTalkingHead, type StudioTalkingHeadProps} from "./StudioTalkingHead";

export const RemotionRoot = () => {
  return (
    <Folder name="TalkingHead">
      <Composition
        id="StudioTalkingHead"
        component={StudioTalkingHead}
        durationInFrames={Math.round(demoProject.durationSeconds * demoProject.fps)}
        fps={demoProject.fps}
        width={1920}
        height={1080}
        defaultProps={demoProject satisfies StudioTalkingHeadProps}
      />
    </Folder>
  );
};
