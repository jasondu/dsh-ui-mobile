# dsh-ui-mobile

[![npm version](https://img.shields.io/npm/v/dsh-ui-mobile)](https://www.npmjs.com/package/dsh-ui-mobile)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Mobile client plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web shell.**

English | [中文](README.zh.md)

Below **768px** the Web GUI's three-column layout becomes a single conversation column with two off-canvas drawers — the session sidebar slides in from the left, the details panel from the right — driven by a thumb-reachable bottom nav bar. Desktop and tablet (768–1023px) layouts are untouched.

## Features

- **Phone-first shell** — below 768px the frame becomes a single conversation column that fills the screen.
- **Off-canvas drawers** — the sidebar drawer (`min(84vw, 340px)`) and the details drawer (up to 480px) slide in over the conversation and close with a tap on the scrim behind them.
- **Bottom nav bar** — two 48px touch targets (菜单 / 详情) register into the shell's additive `shell.overlay` slot, so the bar is composable in and out and tears down with the plugin.
- **Touch-first hygiene** — `100dvh` mounting (follows the URL bar and keyboard), safe-area-aware bottom padding, 16px inputs so iOS never zooms the composer, `touch-action: manipulation`, `overscroll-behavior-y: none`, and `prefers-reduced-motion` support.
- **PWA install promotion** — on Chrome/Edge Android an install CTA appears while the browser offers installation; on iOS Safari a one-time "add to home screen" hint shows. Home-screen launches run without browser chrome (see below).
- **Zero shell changes** — the plugin reads the assembled DOM and never re-implements the frame; one cordis row composes it in or out.

## Requirements

- A running **DeepSeek Harness** Web shell — this is a DSH *client plugin*, not a standalone app.
- Runtime peers: `@deepseek-ai/dsh-client-runtime`, `@deepseek-ai/dsh-client-ui-layout`, `@deepseek-ai/dsh-client-ui-slots`, `@deepseek-ai/dsh-client-ui-primitives`, `@deepseek-ai/dsh-client-ui-theme`, `@deepseek-ai/dsh-invariants`, `@deepseek-ai/cordis`, `react@^18`.

> **Dependency note.** The `@deepseek-ai/dsh-client-*` peers live in a restricted npm scope and are
> not published yet. Installing this package warns about the unmet peers; the plugin activates once
> the peers are available (a future official release, a private registry, or installing the harness
> checkout). Until then the plugin runs in this repo's own DSH environment.

## Installation

```sh
# npm
npm install dsh-ui-mobile

# or through a DSH profile (npm registry)
dsh plugin --profile <name> add dsh-ui-mobile

# or directly from git (runs the self-contained prepare script)
dsh plugin --profile <name> add github:jasondu/dsh-ui-mobile
```

Prerelease builds publish under the `next` dist-tag:

```sh
npm install dsh-ui-mobile@next
```

To register the plugin manually in the harness web bundle, add a row to its `cordis.patch.yml`:

```yaml
- id: dsh-ui-mobile
  name: dsh-ui-mobile
```

## Usage

On a phone (or a narrow browser window) the GUI reflows automatically — no configuration needed:

- **菜单** (bottom-left) toggles the session sidebar drawer.
- **详情** (bottom-right) toggles the per-session details drawer; the button appears only while a session is open.
- An open drawer shows a dark scrim; tapping anywhere outside the drawer closes it.
- The composer stays above the bottom bar, and the bar rides above the on-screen keyboard.

Desktop and tablet widths keep the original three-column layout, drag handles, and sidebar auto-collapse behavior.

## Install to home screen (PWA)

The plugin makes the Web GUI an **installable PWA by itself** — no shell change needed. Its node (host) half taps the served index.html to inject the web-manifest link and the iOS PWA meta tags, and serves the manifest JSON plus the packaged icons from `/pwa/` (the injection is server-side, so it is equivalent to shipping those tags statically). The browser half adds the in-app promotion:

- **Chrome / Edge Android** — the plugin shows an install CTA while the browser offers installation (`beforeinstallprompt` pending); tapping it runs the browser's install flow.
- **iOS Safari** — there is no install API, so the plugin shows a one-time hint: *Share → Add to Home Screen*.
- **Standalone launch** — starting the GUI from the home screen uses the manifest's fullscreen display mode, so the browser chrome — including the URL bar — is gone. In-browser visits keep the URL bar; that is the platform's behavior, not a defect.
- **Host-provided PWA tags are replaced** — if the host already declares a manifest or iOS meta, the plugin strips and supersedes them with its own, so behavior is consistent across deployments.
- **Launch is fast and never white** — the plugin's host half injects a boot skeleton (dark background + whale logo) into the served document, so the JS-loading window shows brand feedback instead of a blank screen, and it serves an app-shell Service Worker (`/sw.js`) whose cache strategies make repeat home-screen launches near-instant (hashed assets cache-first; the document stays network-first so a fresh `__DSH_BOOT__` rev always lands).

Prefer a static in-shell manifest instead? `docs/pwa-host.patch` carries the same manifest/icons/meta as plain `apps/web` changes (`git apply --binary` in a deepseek-harness checkout).

## How it works

The plugin never re-implements the frame — it reads the assembled DOM. The frame's column classes are
CSS-module hashed and unreachable from another plugin, so `MobileFrameController` locates the AppFrame
through its own `data-shell-overlay` child, stamps stable `data-mobile-role` attributes on the three
grid columns, and mirrors the frame's `data-sidebar-collapsed` / `data-details-collapsed` flips plus the
phone-tier `matchMedia` query into one reactive snapshot.

The responsive sheet (`mobile.module.css`, side-effect import) restructures the frame with attribute
selectors only: a `minmax(0, 1fr)` grid track with `!important` beats the frame's inline pixel
template, the drawers leave grid flow as `position: fixed` layers, the drag handles hide, and the
center column reserves the bottom strip the nav bar floats in so the composer stays clear of it.

The nav bar registers into the frame's `shell.overlay` list slot (`id: 'mobile-nav'`) — additive,
click-through by default, torn down with the plugin fiber. Its inject face binds the two buttons to
`ctx.layout`'s panel actions (`toggleSidebar` / `openDetails` / `closeDetails`) and to the controller's
subscribe/snapshot pair; a scrim behind an open drawer closes it on tap.

## Development

```sh
pnpm install       # installs the standalone toolchain (tsdown, vitest, …)
pnpm bundle        # emits lib/client.js (browser bundle) + the node half + declarations
pnpm test          # vitest suites (30 tests, 100% source coverage)
pnpm typecheck     # tsc over src/ and tests/
```

`pnpm bundle` is self-contained (tsdown transpiles `src/` directly — no tsc pass, no project
references), so git installs run it through the `prepare` script. `pnpm test` and `pnpm typecheck`
additionally need the `@deepseek-ai` peers resolvable, exactly like a runtime install.

## Publishing

The repo ships a GitHub Actions workflow (`.github/workflows/npm-publish.yml`). Push a version tag or
trigger it from the Actions tab:

```sh
git tag v0.1.0-rc.6 && git push origin v0.1.0-rc.6
```

The dist-tag follows the version shape: a prerelease (contains `-`, e.g. `0.1.0-rc.6`) goes to `next`,
a release (e.g. `0.1.0`) goes to `latest`. The workflow runs `pnpm install --frozen-lockfile` →
`pnpm bundle` → `publint` → `npm publish`. Configure the `NPM_TOKEN` repository secret once
(Settings → Secrets and variables → Actions) with an npm token that has publish rights for
`dsh-ui-mobile`.

## Model Experience

None, as the plugin is browser-side presentation only; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Roadmap

- **Drawers are CSS-only, so drag resizing is unavailable on phones.** The frame's drag handles hide below 768px and the drawer widths are fixed (`min(84vw, 340px)` sidebar, up to 480px details); resizable panels on phones are deferred.
- **No swipe gestures yet.** Drawers open and close through the nav bar and the scrim tap only; swipe-to-open / swipe-to-dismiss is a follow-up.
- **Hardcoded breakpoint.** The 768px phone tier and the shell's 1024px sidebar auto-collapse are independent constants; a tablet intermediate layout (e.g. rail + details overlay) is not covered.
- **Bottom bar overlaps keyboard-driven flows by design.** With the on-screen keyboard up, the nav bar rides above it via `100dvh`; the composer strip still reserves its own space.
- **Composer anchoring is enforced against overscroll.** On phones the composer seat moves to `position: fixed` and the transcript scroller sets `overscroll-behavior-y: contain`, so pulling the chat list past its ends no longer drags the input bar along (iOS rubber-banding cannot be disabled, so the fixed seat — which the platform never displaces — is the mechanism there).

## License

MIT — see [LICENSE](LICENSE).
