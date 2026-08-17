# PWA 宿主补丁——`dsh-ui-mobile` 的宿主侧要求

[English](pwa-host.md) | 中文

要让 Web GUI 成为**可安装 PWA**（主屏幕启动无地址栏），**宿主页面**必须提供 web manifest、PNG 图标与 iOS meta 标签。本补丁恰好携带这些 `apps/web` 改动。仅安装插件本身无法让页面可安装——见包 README 的 *安装到主屏幕（PWA）* 一节。

## 补丁内容

| 路径（在 `deepseek-ai/deepseek-harness` 中） | 改动 |
|---|---|
| `apps/web/public/manifest.webmanifest` | 新增 `description`、`theme_color #4D6BFE`、`background_color`、PNG 图标（192/512 `any` + 512 `maskable`）；保留 `display: "fullscreen"` |
| `apps/web/public/icons/` | `icon.svg` 源文件 + 生成的 `icon-192.png`、`icon-512.png`、`apple-touch-icon-180.png` |
| `apps/web/index.html` | iOS PWA meta（`apple-mobile-web-app-capable`、`apple-mobile-web-app-status-bar-style`、`apple-mobile-web-app-title`）+ `apple-touch-icon` 链接 |

## 应用方法

```sh
# 在 deepseek-harness 检出根目录执行
git apply --binary docs/pwa-host.patch
```

（补丁由 `git diff --binary` 生成，PNG 图标可无损应用；交付前已对产出树做过反向校验。）

## 重新生成图标

如需调整图标（品牌色、形状）：

```sh
rsvg-convert -w 512 -h 512 apps/web/public/icons/icon.svg -o apps/web/public/icons/icon-512.png
rsvg-convert -w 192 -h 192 apps/web/public/icons/icon.svg -o apps/web/public/icons/icon-192.png
rsvg-convert -w 180 -h 180 apps/web/public/icons/icon.svg -o apps/web/public/icons/apple-touch-icon-180.png
```

## 部署后验证

```sh
curl -s localhost:3080/manifest.webmanifest | grep -E '"display"|icon-192|theme_color'   # fullscreen + PNG 图标
curl -s -o /dev/null -w '%{http_code}\n' localhost:3080/icons/icon-192.png               # 200
curl -s localhost:3080/ | grep -c apple-mobile-web-app-capable                          # 1
```

随后在手机上：Chrome/Edge Android 显示插件的安装入口；iOS Safari 显示一次性"添加到主屏幕"提示。从主屏幕启动即无浏览器外壳。
