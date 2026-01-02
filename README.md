# Video Web Editor

一个基于浏览器的视频编辑器，使用 React + TypeScript + FFmpeg WebAssembly 构建。

## 功能特性

- 🎬 视频裁剪（设置开始时间和持续时间）
- ⚡ 极速导出模式（直接复制流，秒速完成）
- 🎯 精确导出模式（重新编码，帧级精确）
- 🎚️ 播放速度控制
- 📍 帧级定位

## 快速开始

### Windows 用户（推荐）

1. 确保已安装 [Node.js](https://nodejs.org/)（建议 18.0 或更高版本）
2. 双击运行 `start.bat`
3. 浏览器会自动打开，享受视频编辑！

### 手动运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

然后在浏览器打开 http://localhost:3000

## 导出模式说明

| 模式 | 速度 | 精度 | 适用场景 |
|------|------|------|----------|
| ⚡ 极速 | 极快（秒级） | 可能在非关键帧处略有偏差 | 快速预览、不需要精确到帧 |
| 🎯 精确 | 较慢 | 帧级精确 | 需要精确剪辑点 |

## 构建部署

```bash
# 构建生产版本
npm run build

# 构建产物在 dist/ 目录
```

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- FFmpeg WebAssembly

## 许可证

MIT License
