import {Composition, Folder} from "remotion";
import {demoProject} from "./demoData";
import {ArticleVideo, type ArticleVideoProps} from "./ArticleVideo";

export const RemotionRoot = () => {
  return (
    <Folder name="WechatArticle">
      <Composition
        id="ArticleVideo"
        component={ArticleVideo}
        durationInFrames={Math.round(demoProject.durationSeconds * demoProject.fps)}
        fps={demoProject.fps}
        width={1920}
        height={1080}
        defaultProps={demoProject satisfies ArticleVideoProps}
      />
    </Folder>
  );
};
