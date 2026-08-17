# dsh-ui-mobile

[![npm version](https://img.shields.io/npm/v/dsh-ui-mobile)](https://www.npmjs.com/package/dsh-ui-mobile)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

中文 | [English](README.en.md)

把 DeepSeek Harness 变成一套**真正适合在手机上持续使用**的工作台：侧栏可单手操作、输入区不会被键盘挤走、可安装为独立 App，并能在 agent 成功完成后主动提醒你回来查看结果。

`dsh-ui-mobile` 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web Shell 的移动端插件。它不重写会话界面，而是在手机宽度下把现有三栏 Shell 转换为更适合触控、PWA 安装和任务完成通知的体验；桌面与平板布局保持原样。

## 为什么安装

如果你会通过手机查看或发起 Harness 任务，这个插件解决的是高频摩擦，而不是只换一套样式：

- **添加到桌面，获得类 App 体验**：把 Web GUI 添加到主屏幕后，可从图标独立启动、没有浏览器地址栏；agent 成功完成时还能收到系统推送，不必反复打开页面确认。
- **手机上也能高效操作**：边缘滑动、抽屉导航、新会话菜单和键盘“发送”让核心操作无需放大、缩小或寻找小控件。
- **不牺牲桌面工作流**：改动只在 768px 以下启用，电脑与平板继续使用原生 Harness 三栏界面。
- **安装后即可用**：插件自带 PWA、Service Worker 和 Web Push 路由，不需要维护 Harness 的 fork 或额外改 Web 源码。

适合需要在移动端跟进长任务、外出时临时发起任务，或希望把 Harness 作为桌面图标中的轻量工作 App、把任务完成提醒交给系统通知的使用者。

## 你会得到什么

- **手机端抽屉导航**：侧边栏与详情面板从屏幕两侧滑出；轻点遮罩、点菜单或从左侧边缘右滑都能管理侧边栏。
- **连续的会话入口**：普通会话和空白新会话都提供左上菜单；抽屉打开后会覆盖按钮，避免层级冲突。
- **更适合手机的输入区**：输入框固定在可视区底部，防止 iOS 缩放；隐藏 Session log 下载，将 Access mode 放到工具栏最右侧；键盘主操作显示为“发送”。
- **独立 PWA**：添加到主屏幕后，从桌面图标启动即获得无地址栏的类 App 体验；插件提供 manifest、图标、Service Worker、启动骨架和安装引导，无需修改 Harness Web 源码。
- **任务完成通知**：已安装的 PWA 可在 agent 成功完成时收到 Web Push 通知；通知只在成功完成时发送。

## 安装

需要一个运行中的 DeepSeek Harness Web Shell。本包是客户端插件，不是独立 Web 应用。

```sh
# 从 npm 安装到某个 DSH profile
dsh plugin --profile <profile> add dsh-ui-mobile

# 或从当前仓库 / GitHub 安装
dsh plugin --profile <profile> add github:jasondu/dsh-ui-mobile
```

插件自带 `cordis.patch.yml`：它会禁用宿主内置的 `ui-mobile`，再挂载本插件，以避免两个 PWA 路由和两套移动端样式同时生效。通常不需要手动编辑宿主的 patch 文件。

> `@deepseek-ai/dsh-client-*` 是运行时 peer dependencies。应在拥有相应 Harness 依赖的 DSH Web 环境中安装本插件。

## 手机上的使用方式

| 场景 | 操作 |
| --- | --- |
| 打开侧边栏 | 点左上菜单，或从屏幕最左侧 24px 向右滑。 |
| 关闭侧边栏 | 点菜单或抽屉外的暗色区域。 |
| 新开会话 | 空白会话顶部同样保留菜单入口。 |
| 发送消息 | 手机键盘显示“发送”；按回车沿用 Harness 的正常发送流程。 |
| 使用桌面 | 宽度达到 768px 后恢复 Harness 原始三栏布局。 |

侧边栏在手机上使用紧凑宽度 `min(78vw, 300px)`，列表保持可读，同时保留足够的遮罩关闭区域。

## 安装到主屏幕（PWA）

插件的宿主部分会在服务页面时注入 manifest 与 iOS PWA 标签，并通过 `/pwa/` 提供图标、manifest 和 Service Worker。

- **Android Chrome / Edge**：浏览器可安装时会显示一次性安装引导；点“安装”使用浏览器原生流程。
- **iOS Safari**：引导提示“分享 → 添加到主屏幕”。关闭后不会在该浏览器中再次自动显示。
- **从主屏幕启动**：以独立 PWA 运行，不显示浏览器地址栏；普通 Safari 访问仍保留浏览器外壳，这是平台行为。

## 任务完成 Web Push

插件只在 agent 成功完成时（`turn/end`，`reason.kind: completed`）发送通知。为 Web 服务设置 VAPID 和订阅存储路径；私钥与订阅文件不可提交到仓库。

```sh
# 三项同时设置；首次运行时将其写入 DSH_WEB_PUSH_VAPID_PATH。
DSH_WEB_PUSH_VAPID_SUBJECT=mailto:ops@example.com
DSH_WEB_PUSH_VAPID_PUBLIC_KEY=<base64url-public-key>
DSH_WEB_PUSH_VAPID_PRIVATE_KEY=<base64url-private-key>

# 后续启动只需保留此路径；文件权限应为 0600。
DSH_WEB_PUSH_VAPID_PATH=/var/lib/dsh/vapid.json
DSH_WEB_PUSH_STORE_PATH=/var/lib/dsh/push-subscriptions.json
```

在已安装的 PWA 中点按“开启任务完成通知”并授予系统权限即可订阅。iOS 需要 iOS 16.4 或更高版本；`DSH_WEB_PUSH_VAPID_SUBJECT` 必须是有效邮箱或真实 `https://` URL，不能使用 `.invalid` 占位域名。

## 架构边界

插件通过 Harness 已公开的 slot、服务与稳定 `data-*` 属性组合功能：它不复制 Shell，也不修改 Harness 源码。移动端控制器读取现有 AppFrame 状态，响应式样式只针对插件标记的属性；PWA 与 Web Push 路由由插件的 node 部分提供。

## 模型体验

移动布局、PWA 和通知不改变模型请求、系统提示词、工具 schema 或会话内容。Web Push 仅在宿主已判定 agent 成功完成后向已订阅设备发送事件。

#### KV Cache 影响

无。本插件不参与请求组装。

## 已知限制

- 抽屉是 CSS 驱动的固定宽度面板，手机端不支持拖拽调宽。
- 侧边栏支持左边缘滑入；关闭操作为点遮罩或菜单，不支持滑动关闭。
- PWA 安装与键盘“发送”文案受浏览器和系统版本控制；插件提供的是标准 Web 平台提示。
- 任务完成通知需要 HTTPS、有效 VAPID 配置和用户授权。

## 开发与发布

```sh
pnpm install
pnpm bundle
pnpm test
```

推送 `v*` 标签会触发 GitHub Actions：安装依赖、构建、运行 `publint`，再发布到 npm。正式版本使用 `latest`，预发布版本使用 `next`。

## License

MIT — see [LICENSE](LICENSE).
