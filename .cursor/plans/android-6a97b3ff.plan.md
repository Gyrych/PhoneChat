<!-- 6a97b3ff-7731-4e2a-8535-e5123ec9bb45 18fb2832-78e6-4eea-b082-9fe07aeceeff -->
# FreeChat 安卓封装计划（Capacitor → APK）

## 前置准备

- 安装 Node.js LTS 与 npm
- 安装 Android Studio（含 Android SDK/Platform Tools），配置 ANDROID_HOME（若需要）
- Windows PowerShell：命令逐行执行，不使用 &&

## 新增/修改文件

- 新增 `package.json`（npm 初始化 + 脚本）
- 新增 `capacitor.config.json`：
```1:13:capacitor.config.json
{
  "appId": "com.freechat.app",
  "appName": "FreeChat",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "server": {
    "androidScheme": "https"
  }
}
```

- 不改动现有源文件逻辑，保留流式 `fetch`。
- 新增构建输出目录 `dist/`（复制静态资源：`*.html, *.css, *.js, icon/**/*`）。

## 依赖安装（npm）

- 运行（逐行）：
  - npm init -y
  - npm install @capacitor/core @capacitor/cli @capacitor/android --save
  - npm install rimraf copyfiles --save-dev

## npm 脚本

- 在 `package.json` 中添加：
  - "build": 清空并复制静态资源到 `dist/`
  - "sync": 执行 `npx cap copy android`
  - "android": 执行 `npx cap open android`

示例：

```1:8:package.json
{
  "name": "freechat",
  "version": "1.0.0",
  "scripts": {
    "build": "rimraf dist; copyfiles -u 0 index.html config.html conversations.html style.css logger.js prompts.js script.js icon/**/* dist",
    "sync": "npx cap copy android",
    "android": "npx cap open android"
  }
}
```

## Capacitor 初始化与安卓工程

- 逐行执行：
  - npm run build
  - npx cap init FreeChat com.freechat.app --web-dir=dist
  - npx cap add android
  - npx cap copy android
  - npx cap open android（在 Android Studio 中构建/运行到真机或模拟器）

## 运行与调试

- 首次构建后，若修改前端文件：
  - npm run build
  - npm run sync
  - 在 Android Studio 里重新运行

## CORS/网络说明

- 目标端点为 `https://openrouter.ai/api/v1/chat/completions`，在 WebView 中以 `capacitor://localhost` 源发起 `fetch`。
- 预计可直接跨域成功并保留流式（SSE）能力；若遇到 CORS 拒绝：
  - 方案一（推荐后续）：改为后端代理；
  - 方案二（权宜）：接入原生 HTTP 插件（会牺牲流式，或需改造）。

## 应用图标（可选）

- 现有 `icon/icon.png` 仅用于网页图标；安卓应用图标需替换 `android/app/src/main/res/mipmap-*/ic_launcher*`（如需我可后续处理）。

## 文档同步

- 实施后更新 `CURSOR.md`：新增“安卓封装架构/打包流程/注意事项”章节，记录变更。
- 更新 `README.md` 与 `README_zh.md`：新增“Android 构建与安装”章节（命令/步骤/已知问题）。

### To-dos

- [ ] 初始化npm与依赖安装（Capacitor、工具）
- [ ] 新增capacitor.config.json并配置webDir=dist
- [ ] 添加build脚本复制静态资源到dist
- [ ] 初始化Capacitor并添加android平台
- [ ] Android Studio打开工程并构建运行到设备
- [ ] 同步更新CURSOR.md与README（新增Android章节）