# dsh-ui-mobile

[![npm version](https://img.shields.io/npm/v/dsh-ui-mobile)](https://www.npmjs.com/package/dsh-ui-mobile)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web Shell 的移动端客户端插件。**

[English](README.md) | 中文

在 **768px** 以下，Web GUI 的三栏布局变为单栏会话视图，配有两个离屏抽屉——会话侧边栏从左滑入、详情面板从右滑入——由底部拇指可达的导航栏驱动。桌面与平板（768–1023px）布局保持不变。

## 特性

- **手机优先的 Shell**——768px 以下框架变为占满屏幕的单栏会话视图。
- **离屏抽屉**——侧边栏抽屉（`min(84vw, 340px)`）与详情抽屉（最大 480px）滑入会话之上，点按背后的遮罩即可关闭。
- **底部导航栏**——两个 48px 触控目标（菜单 / 详情）注册进 Shell 的增量式 `shell.overlay` 槽，可组合进出、随插件卸载。
- **触屏优先细节**——`100dvh` 挂载（跟随地址栏与键盘显隐）、安全区感知的底部内边距、16px 输入字号（避免 iOS 对输入区自动缩放）、`touch-action: manipulation`、`overscroll-behavior-y: none`、`prefers-reduced-motion` 支持。
- **PWA 安装引导**——Chrome/Edge Android 在浏览器可安装时显示安装入口；iOS Safari 显示一次"添加到主屏幕"提示。从主屏幕启动时无浏览器外壳（见下文）。
- **零 Shell 改动**——插件只读取已装配的 DOM，从不重写框架；一行 cordis 配置即可组合进/出。

## 环境要求

- 运行中的 **DeepSeek Harness** Web Shell——这是 DSH *客户端插件*，不是独立应用。
- 运行时对等依赖：`@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-client-ui-layout`、`@deepseek-ai/dsh-client-ui-slots`、`@deepseek-ai/dsh-client-ui-primitives`、`@deepseek-ai/dsh-client-ui-theme`、`@deepseek-ai/dsh-invariants`、`@deepseek-ai/cordis`、`react@^18`。

> **依赖说明。** `@deepseek-ai/dsh-client-*` 系列对等依赖位于 restricted scope，目前尚未发布。
> 安装本包时会对未满足的 peer 给出警告；待这些依赖可用后（官方发布、私有 registry，或安装 harness
> 源码检出），插件即可激活。在此之前，插件在本仓库自带的 DSH 环境中运行。

## 安装

```sh
# npm
npm install dsh-ui-mobile

# 或通过 DSH profile（npm registry）
dsh plugin --profile <name> add dsh-ui-mobile

# 或直接从 git 安装（会运行自包含的 prepare 脚本）
dsh plugin --profile <name> add github:jasondu/dsh-ui-mobile
```

预发布版本发布在 `next` dist-tag 下：

```sh
npm install dsh-ui-mobile@next
```

如需在 harness web bundle 中手动注册，在其 `cordis.patch.yml` 中添加一行：

```yaml
- id: dsh-ui-mobile
  name: dsh-ui-mobile
```

## 使用

在手机（或窄浏览器窗口）上，GUI 自动重排，无需任何配置：

- **菜单**（左下）开合会话侧边栏抽屉。
- **详情**（右下）开合当前会话的详情抽屉；该按钮仅在会话打开时出现。
- 抽屉打开时背后出现深色遮罩，点按抽屉外任意处即可关闭。
- 输入区始终位于底部导航栏之上，导航栏随屏幕键盘上移。

桌面与平板宽度保持原有三栏布局、拖拽把手与侧边栏自动收起行为不变。

## 安装到主屏幕（PWA）

插件**自带完整宿主能力，无需修改 shell**即可让 Web GUI 成为可安装 PWA。其 node（宿主）半区在服务 index.html 时注入 manifest 链接与 iOS PWA meta 标签，并从 `/pwa/` 路由提供 manifest JSON 与打包图标（服务端注入，与静态内置对浏览器完全等效）。浏览器半区负责应用内引导：

- **Chrome / Edge Android**——浏览器可安装时（`beforeinstallprompt` 挂起），插件显示安装入口，点按后调用浏览器安装流程。
- **iOS Safari**——没有安装 API，插件显示一次性提示：*分享 → 添加到主屏幕*。
- **standalone 启动**——从主屏幕启动 GUI 使用 manifest 的 fullscreen 显示模式，浏览器外壳（含地址栏）完全消失。浏览器内直接访问仍保留地址栏——这是平台行为，不是缺陷。
- **宿主已有的 PWA 标签会被替换**——若宿主已声明 manifest 或 iOS meta，插件会移除并以其自身版本取代，保证各部署行为一致。

更倾向于把 manifest 静态内置进 shell？`docs/pwa-host.patch` 携带同样的 manifest/图标/meta 作为纯 `apps/web` 改动（在 deepseek-harness 检出中 `git apply --binary`）。

## 工作原理

插件从不重写框架，而是读取已装配的 DOM。框架的列类名经 CSS Modules 哈希，其他插件无法触及，
因此 `MobileFrameController` 通过框架自身的 `data-shell-overlay` 子元素定位 AppFrame，为三个网格列
打上稳定的 `data-mobile-role` 属性，并把框架的 `data-sidebar-collapsed` / `data-details-collapsed`
翻转以及手机档 `matchMedia` 查询镜像为一份响应式快照。

响应式样式表（`mobile.module.css`，副作用导入）仅用属性选择器重构框架：以 `!important` 的
`minmax(0, 1fr)` 网格轨道压过框架的内联像素模板，抽屉以 `position: fixed` 层脱离网格流，拖拽把手
隐藏，中栏为底部导航栏预留悬浮条带，使输入区始终位于其上。

导航栏注册进框架的 `shell.overlay` 列表槽（`id: 'mobile-nav'`）——增量式、默认点击穿透、随插件
fiber 卸载。其 inject 面把两个按钮绑定到 `ctx.layout` 的面板动作（`toggleSidebar` /
`openDetails` / `closeDetails`）以及控制器的订阅/快照对；打开的抽屉背后有遮罩，点按即关闭。

## 开发

```sh
pnpm install       # 安装独立工具链（tsdown、vitest 等）
pnpm bundle        # 产出 lib/client.js（浏览器 bundle）+ node 半区 + 声明文件
pnpm test          # vitest 套件（30 个测试，源码 100% 覆盖率）
pnpm typecheck     # tsc 检查 src/ 与 tests/
```

`pnpm bundle` 完全自包含（tsdown 直接转译 `src/`——无需 tsc 前置、无项目引用），因此 git 安装会
通过 `prepare` 脚本运行它。`pnpm test` 与 `pnpm typecheck` 额外需要 `@deepseek-ai` 对等依赖可解析，
与运行时安装的要求一致。

## 发布

仓库内置 GitHub Actions workflow（`.github/workflows/npm-publish.yml`）。推送版本 tag，或在 Actions
页手动触发：

```sh
git tag v0.1.0-rc.6 && git push origin v0.1.0-rc.6
```

dist-tag 随版本形态自动判定：预发布版本（含 `-`，如 `0.1.0-rc.6`）进入 `next`，正式版本（如
`0.1.0`）进入 `latest`。流程为 `pnpm install --frozen-lockfile` → `pnpm bundle` → `publint` →
`npm publish`。首次需在仓库配置 `NPM_TOKEN` secret（Settings → Secrets and variables → Actions），
值为对 `dsh-ui-mobile` 包有发布权限的 npm token。

## Model Experience

None, as the plugin is browser-side presentation only; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## 已知限制与路线图

- **抽屉仅由 CSS 实现，手机端无法拖拽调宽。** 768px 以下隐藏了框架的拖拽把手，抽屉宽度固定（侧边栏 `min(84vw, 340px)`，详情最大 480px）；手机端面板调宽留待后续。
- **暂无滑动手势。** 抽屉只能通过导航栏与遮罩点按开合；滑动打开/关闭是后续项。
- **断点写死。** 768px 手机档与 Shell 的 1024px 侧边栏自动收起是相互独立的常量；平板中间态布局（如窄轨 + 详情浮层）不在覆盖范围内。
- **底部栏与键盘联动为设计使然。** 屏幕键盘弹出时，导航栏随 `100dvh` 上移；输入区仍保留自身预留条带。

## License

MIT——见 [LICENSE](LICENSE)。
