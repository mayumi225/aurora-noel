# 极光圣诞树 · Aurora Noël

![预览](docs/preview.png)

在雪山与极光下实时渲染的交互式 3D 圣诞树。松针、灯串、彩球、礼盒、雪地、相册占位图全部由程序绘制，并支持摄像头手势控制。

## 功能

- Three.js 实时场景：粒子星尘、极光天空、飘雪、辉光后期
- 圣诞树 / 星光漂浮两种展示模式
- 圣诞布置：粒子数量、主色、点缀色、礼盒与彩球数量
- 回忆相册：照片保存在浏览器 IndexedDB，以 3D 金属相框展示
- 手势控制：MediaPipe Hands，食指移动光标、捏合抓取照片、张开手掌绽放星光
- 音乐律动：音频频谱驱动灯光与粒子
- 圣诞倒计时与名字定制

## 技术栈

React 19 · Three.js r181 · Vite 6 · @mediapipe/hands · lucide-react

## 本地运行

需要 Node.js 22.12+，以及 pnpm 或 npm。

```sh
pnpm install
pnpm dev
```

打开终端显示的地址即可。追加 `?lite` 参数可以减少粒子、雪花和装饰，并关闭辉光后期。

生产构建：

```sh
pnpm build
pnpm preview
```

产物位于 `dist/`，可直接部署到 Netlify、Vercel、GitHub Pages 等静态托管。

## 使用说明

- 拖动旋转，滚轮或双指缩放，按住画面绽放星光。
- 「圣诞布置」可切换模式、调整粒子与装饰，或上传本地音乐。
- 「回忆相册」支持 JPG / PNG / WEBP，照片保存在当前浏览器，不会上传。
- 「手势控制」需要摄像头权限；视频帧只在浏览器本地处理。
- 「定制名字」会更新开场与主场景的祝福，并在当前浏览器记住。

## 素材与许可

- 代码以 MIT License 开源，详见 [LICENSE](LICENSE)
- Cormorant Garamond 与 Noto Serif SC 按 SIL Open Font License 分发，许可文件位于 `public/fonts/`
- 手势识别使用 [MediaPipe Hands](https://developers.google.com/mediapipe)（Apache-2.0）
- 默认音乐为外链 Ikson《Christmas》；外链不可用时播放项目内生成的《Silent Night》八音盒编曲
