/**
 * Mobile plugin, browser half: the responsive shell surface.
 *
 * One effect owns the DOM side — the MobileFrameController stamps stable data
 * attributes on the assembled AppFrame (whose column classes are CSS-module
 * hashed and unreachable cross-plugin) and mirrors drawer + viewport state;
 * the mobile.module.css sheet (side-effect import) restructures the frame
 * into a single column with off-canvas drawers below 768px. Two registrations
 * contribute to the frame's `shell.overlay` list slot: the phone-tier nav bar
 * (panel actions over ctx.layout) and the PWA install banner (the install
 * controller's snapshot/subscription pair). A second effect owns the install
 * controller's window listeners.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the layout plugin's Context merge (ctx.layout) and the
// ui-layout SlotMap declaration (shell.overlay) into this compilation unit.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { MobileFrameController } from './frame.ts'
import { InstallController } from './install.ts'
import { InstallBanner, type InstallBannerInjected } from './InstallBanner.tsx'
import { MobileNav, type MobileNavInjected } from './MobileNav.tsx'
import './mobile.module.css'

export type { MobileNavInjected } from './MobileNav.tsx'
export type { MobileNavState } from './frame.ts'
export type { InstallBannerInjected } from './InstallBanner.tsx'
export type { InstallState } from './install.ts'

/** Required services: the layout panel actions and the slot registry. */
export const inject = ['layout', 'slots']

/**
 * Client plugin body: start the frame and install controllers, then register
 * the nav bar and the install banner into the shell overlay once the frame
 * declares it.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
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

  ctx.slots.inject('shell.overlay', () => {
    const registerNav = ctx.slots.register({
      name: 'shell.overlay',
      id: 'mobile-nav',
      order: 100,
      label: '移动端导航',
      inject: (): MobileNavInjected => ({
        toggleSidebar: () => ctx.layout.toggleSidebar(),
        toggleDetails: () => {
          if (controller.snapshot().detailsOpen) ctx.layout.closeDetails()
          else ctx.layout.openDetails()
        },
        subscribe: listener => controller.subscribe(listener),
        snapshot: () => controller.snapshot(),
      }),
    }, MobileNav)
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
      registerNav()
      registerBanner()
    }
  })
}
