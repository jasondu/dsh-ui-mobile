# dsh-ui-mobile

[![npm version](https://img.shields.io/npm/v/dsh-ui-mobile)](https://www.npmjs.com/package/dsh-ui-mobile)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[中文](README.md) | English

Turn DeepSeek Harness into a workspace you can **actually keep using from your phone**: one-handed navigation, a composer that stays usable around the keyboard, an installable app surface, and a notification when an agent finishes successfully.

`dsh-ui-mobile` is a mobile experience plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web shell. It keeps the existing conversation UI intact, then adapts the assembled three-column shell for touch, PWA installation, and completed-task notifications below the phone breakpoint. Desktop and tablet layouts remain unchanged.

## Why install it

If you check or start Harness tasks from a phone, this plugin removes recurring workflow friction rather than merely changing the visual theme:

- **Add it to your Home Screen for an app-like experience** — launch the GUI from its own icon without browser chrome, then receive a system push notification after an agent completes successfully instead of repeatedly reopening the page to check.
- **Operate efficiently on a phone** — edge swipe, drawer navigation, a menu for blank conversations, and a Send keyboard action make common controls easy to reach without zooming or hunting for small targets.
- **Keep the desktop workflow** — changes activate only below 768px; desktop and tablet retain the native Harness three-column interface.
- **Install instead of maintaining a fork** — PWA assets, service worker, and Web Push routes ship with the plugin, so Harness Web source does not need to be modified.

It is well suited to Harness users who monitor long-running work from a phone, start work while away from their desk, want a lightweight workspace from a Home Screen icon, or want the operating system to surface completed-task updates.

## What it adds

- **Phone drawer navigation** — sidebar and details panels slide in from either edge; use the menu, the scrim, or a left-edge swipe to manage the sidebar.
- **A continuous menu entry** — the top-left menu is available in ordinary conversations and blank new conversations. An opened drawer correctly sits above its trigger.
- **A phone-oriented composer** — the composer stays at the visible viewport bottom, avoids iOS input zoom, hides Session log download, moves Access mode to the trailing edge, and advertises the keyboard action as Send.
- **A self-contained PWA** — add it to the Home Screen and launch from its own icon for an app-like, browser-chrome-free surface. Manifest, icons, service worker, boot shell, and installation guidance are supplied by the plugin; no Harness Web source change is required.
- **Completed-task notifications** — an installed PWA can receive Web Push after an agent completes successfully, and never for an unsuccessful completion.

## Install

You need a running DeepSeek Harness Web shell. This is a client plugin, not a standalone web application.

```sh
# Install from npm into a DSH profile
dsh plugin --profile <profile> add dsh-ui-mobile

# Or install from this repository / GitHub
dsh plugin --profile <profile> add github:jasondu/dsh-ui-mobile
```

The package ships its own `cordis.patch.yml`. It disables the host's built-in `ui-mobile` entry and mounts this replacement, preventing two PWA route sets and two mobile style layers from running together. You normally do not need to edit the host patch manually.

> `@deepseek-ai/dsh-client-*` packages are runtime peer dependencies. Install this plugin in a DSH Web environment that provides the corresponding Harness dependencies.

## On a phone

| Task | How it works |
| --- | --- |
| Open the sidebar | Tap the top-left menu, or swipe right from the leftmost 24px of the screen. |
| Close the sidebar | Tap the menu again or the dark area outside the drawer. |
| Start a conversation | The menu remains available while the new conversation is blank. |
| Send a message | The virtual keyboard advertises Send; Enter follows Harness's normal send path. |
| Return to desktop | At 768px and above, the original Harness three-column layout is used. |

The phone sidebar uses a compact `min(78vw, 300px)` width: session rows remain readable while a deliberate scrim area remains available for dismissal.

## Install to Home Screen (PWA)

The node half of the plugin injects the manifest and iOS PWA metadata while serving the document, and serves icons, the manifest, and the service worker from `/pwa/`.

- **Chrome / Edge on Android** — a one-time install prompt appears when the browser exposes its native install flow.
- **Safari on iOS** — guidance explains *Share → Add to Home Screen*. Closing it suppresses future automatic prompts in that browser.
- **Home-screen launch** — runs as a standalone PWA without the browser URL bar. A normal Safari visit keeps browser chrome; that is platform behavior.

## Completed-task Web Push

The plugin sends a notification only for a successful agent completion (`turn/end` with `reason.kind: completed`). Set VAPID credentials and a durable subscription store for the Web service; never commit private keys or subscriptions.

```sh
# Set all three together; the first launch persists them at DSH_WEB_PUSH_VAPID_PATH.
DSH_WEB_PUSH_VAPID_SUBJECT=mailto:ops@example.com
DSH_WEB_PUSH_VAPID_PUBLIC_KEY=<base64url-public-key>
DSH_WEB_PUSH_VAPID_PRIVATE_KEY=<base64url-private-key>

# Later launches need only this persisted, mode-0600 file.
DSH_WEB_PUSH_VAPID_PATH=/var/lib/dsh/vapid.json
DSH_WEB_PUSH_STORE_PATH=/var/lib/dsh/push-subscriptions.json
```

In the installed PWA, choose **Enable task completion notifications** and grant the browser permission. iOS requires iOS 16.4 or later. `DSH_WEB_PUSH_VAPID_SUBJECT` must be a valid email address or real `https://` URL; Apple rejects placeholder domains such as `.invalid`.

## Architecture boundary

The plugin composes through Harness slots, services, and stable `data-*` attributes. It does not duplicate the shell or modify Harness source. Its mobile controller reads existing AppFrame state, its responsive stylesheet targets only plugin-stamped attributes, and its node half owns the PWA and Web Push routes.

## Model Experience

Mobile layout, PWA behavior, and notifications do not change model requests, system prompts, tool schemas, or conversation content. Web Push is emitted only after the host has already recorded a successful agent completion.

#### KV Cache effect

None. This plugin does not participate in request assembly.

## Known limitations

- Drawers are CSS-driven fixed-width panels; phone drag-resizing is not available.
- The sidebar opens with a left-edge swipe; dismissal is a scrim or menu action, not a swipe gesture.
- PWA installation and the virtual keyboard's Send label ultimately depend on the browser and OS version; the plugin uses standard Web Platform hints.
- Completed-task notifications require HTTPS, valid VAPID configuration, and user permission.

## Development and release

```sh
pnpm install
pnpm bundle
pnpm test
```

Pushing a `v*` tag starts GitHub Actions: dependencies are installed, the package is built, `publint` runs, and npm publishing follows. Stable versions use `latest`; prereleases use `next`.

## License

MIT — see [LICENSE](LICENSE).
