# dsh-ui-mobile

[![npm version](https://img.shields.io/npm/v/dsh-ui-mobile)](https://www.npmjs.com/package/dsh-ui-mobile)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Mobile client plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web shell.**

English | [中文](README.zh.md)

Below **768px** the Web GUI's three-column layout becomes a single conversation column with an off-canvas sidebar drawer — opened by an icon-only toggle at the far left of the session header. Desktop and tablet (768–1023px) layouts are untouched.

## Features

- **Phone-first shell** — below 768px the frame becomes a single conversation column that fills the screen.
- **Off-canvas drawers** — the sidebar drawer (`min(84vw, 340px)`) and the details drawer (up to 480px) slide in over the conversation and close with a tap on the scrim behind them; swipe right from the left 24px edge to open a collapsed sidebar.
- **Header menu toggle** — an icon-only sidebar toggle registers into the session header's left-of-title strip (`conversation.session.header.left`, an additive list seat), so it composes in and out and tears down with the plugin; a tap-outside scrim closes the drawer.
- **Touch-first hygiene** — `100dvh` mounting (follows the URL bar and keyboard), safe-area-aware bottom padding, 16px inputs so iOS never zooms the composer, `touch-action: manipulation`, `overscroll-behavior-y: none`, and `prefers-reduced-motion` support.
- **Focused phone toolbar** — hides the Session log download utility and places the Access mode control at the far right of the composer toolbar below 768px.
- **Keyboard restraint on phones** — opening the command panel never pops the on-screen keyboard (the plugin blurs the panel's script-driven search focus). The companion phone-tier behavior — not auto-focusing the composer on button taps or session switch — lives in ui-conversation; use a host DSH carrying those fixes for the fullest effect.
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

- **菜单** (icon at the far left of the session header) toggles the sidebar drawer.
- A rightward swipe beginning at the left screen edge also opens a collapsed sidebar; vertical drags and non-edge swipes remain normal page gestures.
- An open drawer shows a dark scrim; tapping anywhere outside the drawer closes it.
- The Session log download button is hidden and Access mode is at the far right of the phone composer toolbar.
- The composer docks to the screen bottom (no bottom bar), riding above the on-screen keyboard via the platform's keyboard handling.

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
phone-tier `matchMedia` query into one reactive snapshot. It also stamps portable attributes for the existing Session log and Access mode controls, so the compact phone-toolbar rules work with compatible hosts that do not yet expose those attributes themselves.

The responsive sheet (`mobile.module.css`, side-effect import) restructures the frame with attribute
selectors only: a `minmax(0, 1fr)` grid track with `!important` beats the frame's inline pixel
template, the drawers leave grid flow as `position: fixed` layers, the drag handles hide, and the
the composer docks to the screen bottom as a fixed element, and the scroller reserves its live height.

`EdgeSwipeController` recognizes a one-shot rightward gesture beginning in the left 24px of a collapsed phone viewport; it uses a distance threshold rather than drag-following, so it does not add per-frame drawer layout work.

The header menu toggle registers into the session header's left-of-title strip
(`conversation.session.header.left`) and the drawer scrim into the frame's `shell.overlay` list slot —
both additive, torn down with the plugin fiber. Their shared inject face binds the toggle to
`ctx.layout`'s `toggleSidebar` and to the controller's subscribe/snapshot pair; the scrim closes the
open drawer on tap.

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
- **Left-edge open only.** A swipe opens the collapsed sidebar, while dismissal remains the explicit scrim tap or header button action; swipe-to-dismiss is intentionally not implemented.
- **Hardcoded breakpoint.** The 768px phone tier and the shell's 1024px sidebar auto-collapse are independent constants; a tablet intermediate layout (e.g. rail + details overlay) is not covered.
- **No bottom bar anymore.** The composer docks directly to the screen bottom; the iOS keyboard-follow behavior for `position: fixed` bottom elements depends on the platform (a known iOS quirk — see the composer-anchoring note above).
- **Composer anchoring is enforced against overscroll.** On phones the composer seat moves to `position: fixed` and the transcript scroller sets `overscroll-behavior-y: contain`, so pulling the chat list past its ends no longer drags the input bar along (iOS rubber-banding cannot be disabled, so the fixed seat — which the platform never displaces — is the mechanism there).

## License

MIT — see [LICENSE](LICENSE).
