# PWA host patch — install `dsh-ui-mobile`'s host-side requirements

English | [中文](pwa-host.zh.md)

To make the Web GUI an **installable PWA** (home-screen launch without the URL bar), the **host page** must ship the web manifest, PNG icons, and iOS meta tags. This patch carries exactly those `apps/web` changes. The plugin alone cannot make a page installable — see the package README's *Install to home screen (PWA)* section.

## What the patch contains

| Path (in `deepseek-ai/deepseek-harness`) | Change |
|---|---|
| `apps/web/public/manifest.webmanifest` | `description`, `theme_color #4D6BFE`, `background_color`, PNG icons (192/512 `any` + 512 `maskable`); keeps `display: "fullscreen"` |
| `apps/web/public/icons/` | `icon.svg` source + generated `icon-192.png`, `icon-512.png`, `apple-touch-icon-180.png` |
| `apps/web/index.html` | iOS PWA meta (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`) + `apple-touch-icon` link |

## Apply

```sh
# from the deepseek-harness checkout root
git apply --binary docs/pwa-host.patch
```

(The patch was produced with `git diff --binary`, so the PNG icons apply losslessly. It was reverse-checked against the producing tree before delivery.)

## Regenerating the icons

If you want to tweak the icon (brand color, shape):

```sh
rsvg-convert -w 512 -h 512 apps/web/public/icons/icon.svg -o apps/web/public/icons/icon-512.png
rsvg-convert -w 192 -h 192 apps/web/public/icons/icon.svg -o apps/web/public/icons/icon-192.png
rsvg-convert -w 180 -h 180 apps/web/public/icons/icon.svg -o apps/web/public/icons/apple-touch-icon-180.png
```

## Verify after deploy

```sh
curl -s localhost:3080/manifest.webmanifest | grep -E '"display"|icon-192|theme_color'   # fullscreen + PNG icons
curl -s -o /dev/null -w '%{http_code}\n' localhost:3080/icons/icon-192.png               # 200
curl -s localhost:3080/ | grep -c apple-mobile-web-app-capable                          # 1
```

Then, on a phone: Chrome/Edge Android shows the plugin's install CTA; iOS Safari shows the one-time "add to home screen" hint. Launching from the home screen runs without browser chrome.
