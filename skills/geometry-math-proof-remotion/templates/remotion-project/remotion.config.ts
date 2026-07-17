import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// 中国网络下默认会卡在 storage.googleapis.com 下载 Chrome Headless Shell,
// 改用系统 Chrome(已安装)。Edge 不行,Remotion 用了旧 headless flag 而 Edge 已移除。
// Windows 路径示例: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
// macOS: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
Config.setBrowserExecutable('C:/Program Files/Google/Chrome/Application/chrome.exe');
