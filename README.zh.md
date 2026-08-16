# @deepseek-ai/dsh-client-ui-mobile

[English](README.md) | 中文

Web Shell 的移动端插件：在 768px 以下，三栏 AppFrame 变为单栏会话视图，配有两个离屏抽屉——侧边栏从左滑入、详情面板从右滑入——由底部拇指可达的导航栏驱动。其余一切（平板宽度、Shell 自带的 1024px 侧边栏自动收起、拖拽调宽的面板）保持不变。

该插件从不重写框架，而是读取已装配的 DOM。`MobileFrameController` 通过框架自身的 `data-shell-overlay` 子元素定位 AppFrame，为三个网格列打上稳定的 `data-mobile-role` 属性（其真实类名经 CSS Modules 哈希，其他插件无法触及），并把框架的 `data-sidebar-collapsed` / `data-details-collapsed` 翻转以及手机档 `matchMedia` 查询镜像为一份响应式快照。`mobile.module.css` 样式表（副作用导入）随后仅用属性选择器重构框架——以 `!important` 的单一 `minmax(0, 1fr)` 网格轨道压过框架的内联 px 模板，抽屉以 `position: fixed` 层脱离网格流，拖拽把手隐藏，中栏为底部导航栏预留出悬浮条带，使输入区始终位于其上。导航栏注册进框架的 `shell.overlay` 列表槽（`id: 'mobile-nav'`），因此是增量式的、默认点击穿透，并随插件 fiber 一起卸载；其 inject 面把两个按钮绑定到 `ctx.layout` 的面板动作（`toggleSidebar` / `openDetails` / `closeDetails`）以及控制器的订阅/快照对。打开的抽屉背后有一层遮罩，点按遮罩即可关闭。

手机档还附带常规的触屏优先细节：`100dvh` 挂载（跟随地址栏与键盘的显隐）、安全区感知的底部内边距（依赖 Shell index 的 `viewport-fit=cover`）、16px 输入字号（避免 iOS 对输入区自动缩放）、`touch-action: manipulation`、`body` 上的 `overscroll-behavior-y: none`，以及 `prefers-reduced-motion` 时禁用抽屉过渡。

## Model Experience

None, as the plugin is browser-side presentation only; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## 已知限制与待办

- **抽屉仅由 CSS 实现，手机端无法拖拽调宽。** 768px 以下隐藏了框架的拖拽把手，抽屉宽度固定（侧边栏 `min(84vw, 340px)`，详情最大 480px）；手机用户调宽面板留待后续。
- **暂无滑动手势。** 抽屉只能通过导航栏与遮罩点按开合；滑动打开/关闭是后续项。
- **断点写死。** 768px 手机档与 Shell 的 1024px 自动收起是相互独立的常量；平板中间态布局（如窄轨 + 详情浮层）不在覆盖范围内。
- **底部栏与键盘联动为设计使然。** 屏幕键盘弹出时，导航栏随 `100dvh` 上移；输入区仍保留自身预留条带。
