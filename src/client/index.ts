/**
 * Mobile plugin, browser half: the responsive shell surface.
 *
 * One effect owns the DOM side — the MobileFrameController stamps stable data
 * attributes on the assembled AppFrame (whose column classes are CSS-module
 * hashed and unreachable cross-plugin) and mirrors drawer + viewport state;
 * the mobile.module.css sheet (side-effect import) restructures the frame
 * into a single column with off-canvas drawers below 768px. The phone-tier
 * surface is split across three registrations: the sidebar toggle in the
 * session header's left strip (`conversation.session.header.left`), the
 * drawer scrim and the PWA install banner in the frame's `shell.overlay`
 * list slot. A second effect owns the install controller's window listeners.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the layout plugin's Context merge (ctx.layout) and the
// ui-layout SlotMap declaration (shell.overlay) into this compilation unit.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { MobileFrameController } from './frame.ts'
import { InstallController } from './install.ts'
import { InstallBanner, type InstallBannerInjected } from './InstallBanner.tsx'
import { HeaderMenuButton, type HeaderMenuButtonInjected } from './HeaderMenuButton.tsx'
import { DrawerScrim, type DrawerScrimInjected } from './DrawerScrim.tsx'
import { registerServiceWorker } from './sw.ts'
import './mobile.module.css'

export type { HeaderMenuButtonInjected } from './HeaderMenuButton.tsx'
export type { DrawerScrimInjected } from './DrawerScrim.tsx'
export type { MobileNavState } from './frame.ts'
export type { InstallBannerInjected } from './InstallBanner.tsx'
export type { InstallState } from './install.ts'

/** Required services: the layout panel actions and the slot registry. */
export const inject = ['layout', 'slots']

/**
 * Client plugin body: register the app-shell service worker, start the frame
 * and install controllers, then register the header menu toggle, the drawer
 * scrim, and the install banner once their slots are declared.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  registerServiceWorker()
  const controller = new MobileFrameController()
  const install = new InstallController()
  ctx.effect(() => {
    controller.start()
    install.start()
    return () => {
      controller.stop()
      install.stop()
    }
  }, 'ui-mobile: frame stabilization + install controller')

  // Shared inject face for the two drawer-control surfaces (header toggle and
  // the tap-outside scrim): the same frame snapshot + the sidebar toggle.
  const drawerControls = () => ({
    toggleSidebar: () => ctx.layout.toggleSidebar(),
    subscribe: (listener: () => void) => controller.subscribe(listener),
    snapshot: () => controller.snapshot(),
  })

  ctx.slots.inject('conversation.session.header.left', () => ctx.slots.register({
    name: 'conversation.session.header.left',
    id: 'mobile-menu',
    order: -10,
    label: '菜单',
    inject: (): HeaderMenuButtonInjected => drawerControls(),
  }, HeaderMenuButton))

  ctx.slots.inject('shell.overlay', () => {
    const registerScrim = ctx.slots.register({
      name: 'shell.overlay',
      id: 'mobile-scrim',
      order: 110,
      label: '抽屉遮罩',
      inject: (): DrawerScrimInjected => drawerControls(),
    }, DrawerScrim)
    const registerBanner = ctx.slots.register({
      name: 'shell.overlay',
      id: 'mobile-install',
      order: 90,
      label: 'PWA 安装引导',
      inject: (): InstallBannerInjected => ({
        snapshot: () => install.snapshot(),
        subscribe: listener => install.subscribe(listener),
        install: () => install.install(),
        dismissIosHint: () => install.dismissIosHint(),
      }),
    }, InstallBanner)
    return () => {
      registerScrim()
      registerBanner()
    }
  })
}
