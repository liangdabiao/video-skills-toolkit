import {Config} from '@remotion/cli/config';
import {existsSync} from 'node:fs';

// 中国网络下默认下载 Chrome Headless Shell 会卡在 storage.googleapis.com（113MB）。
// 优先用系统已装的 Chrome（和 demo-wx-article 系列一致），跳过下载。
const browserCandidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
for (const p of browserCandidates) {
  if (existsSync(p)) {
    Config.setBrowserExecutable(p);
    break;
  }
}

// 并发度 2：避免高并发下 Windows temp 目录竞争导致音频混合（audio-mixing）失败。
// 这是实测踩过的坑：默认高并发 + 同时跑多个 render 会触发 audio-mixing 目录缺失。
Config.setConcurrency(2);

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
