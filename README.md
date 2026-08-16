# @deepseek-ai/dsh-client-ui-mobile

English | [中文](README.zh.md)

> **Standalone mirror.** This repository is the `ui-mobile` client plugin extracted from
> [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
> (`packages/client/ui-mobile`). The source is authoritative; the in-repo copy lives there.
>
> The plugin is a DSH **client plugin**: it ships no standalone app and only runs inside the
> DeepSeek Harness Web shell. Runtime peers are the `@deepseek-ai/dsh-client-*` packages
> (a restricted npm scope, currently unpublished), so `pnpm install` in this standalone repo
> resolves only after those packages are available (installed from the harness repo, a private
> registry, or a future official release). To use the plugin in a running GUI, register the row
> in the web bundle's `cordis.patch.yml` (`- id: ui-mobile / name: '@deepseek-ai/dsh-client-ui-mobile'`).
> `pnpm bundle` emits `lib/client.js` (browser bundle) plus the node half; `pnpm test` runs the
> vitest suites (30 tests, 100% source coverage).

Mobile plugin for the Web shell: below 768px the three-column AppFrame becomes a single conversation column with two off-canvas drawers — the sidebar slides in from the left and the details panel from the right — driven by a thumb-reachable bottom nav bar. Everything else (tablet widths, the shell's own 1024px sidebar auto-collapse, drag-resized panels) is untouched.

The plugin never re-implements the frame: it reads the assembled DOM. `MobileFrameController` locates the AppFrame through its own `data-shell-overlay` child, stamps stable `data-mobile-role` attributes on the three grid columns (their real classes are CSS-module hashed and unreachable from another plugin), and mirrors the frame's `data-sidebar-collapsed` / `data-details-collapsed` flips plus the phone-tier `matchMedia` query into one reactive snapshot. The `mobile.module.css` sheet (side-effect import) then restructures the frame with plain attribute selectors — a single `minmax(0, 1fr)` grid track with `!important` beats the frame's inline px template, the drawers leave grid flow as `position: fixed` layers, drag handles hide, and the center column reserves the bottom strip the nav bar floats in so the composer stays clear of it. The nav bar registers into the frame's `shell.overlay` list slot (`id: 'mobile-nav'`), so it is additive, click-through by default, and torn down with the plugin fiber; its inject face binds the two buttons to `ctx.layout`'s panel actions (`toggleSidebar` / `openDetails` / `closeDetails`) and to the controller's subscribe/snapshot pair. A scrim behind an open drawer closes it on tap.

The phone tier also carries the usual touch-first hygiene: `100dvh` mounting (URL-bar and keyboard show/hide), safe-area-aware bottom padding (`viewport-fit=cover` from the shell's index), 16px input type so iOS never zooms the composer, `touch-action: manipulation`, `overscroll-behavior-y: none` on `body`, and `prefers-reduced-motion` disabling drawer transitions.

## Model Experience

None, as the plugin is browser-side presentation only; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Drawers are CSS-only, so drag resizing is unavailable on phones.** The frame's drag handles hide below 768px and the drawer widths are fixed (`min(84vw, 340px)` sidebar, up to 480px details); a phone-user resizing the panels is deferred.
- **No swipe gestures yet.** Drawers open and close through the nav bar and the scrim tap only; swipe-to-open / swipe-to-dismiss is a follow-up.
- **Hardcoded breakpoint.** The 768px phone tier and the 1024px shell auto-collapse are independent constants; a tablet-specific intermediate layout (e.g. rail + details overlay) is not covered.
- **Bottom bar overlaps keyboard-driven flows by design.** When the on-screen keyboard is up, the nav bar rides above it via `100dvh`; the composer strip still reserves its own space.
