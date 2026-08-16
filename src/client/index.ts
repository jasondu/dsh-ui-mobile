/**
 * Mobile plugin, browser half: the responsive shell surface.
 *
 * One effect owns the DOM side — the MobileFrameController stamps stable data
 * attributes on the assembled AppFrame (whose column classes are CSS-module
 * hashed and unreachable cross-plugin) and mirrors drawer + viewport state;
 * the mobile.module.css sheet (side-effect import) restructures the frame
 * into a single column with off-canvas drawers below 768px. One registration
 * contributes the phone-tier nav bar into the frame's `shell.overlay` list
 * slot; its inject face binds the bar to the layout service's panel actions
 * and to the controller's snapshot/subscription pair.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the layout plugin's Context merge (ctx.layout) and the
// ui-layout SlotMap declaration (shell.overlay) into this compilation unit.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { MobileFrameController } from './frame.ts'
import { MobileNav, type MobileNavInjected } from './MobileNav.tsx'
import './mobile.module.css'

export type { MobileNavInjected } from './MobileNav.tsx'
export type { MobileNavState } from './frame.ts'

/** Required services: the layout panel actions and the slot registry. */
export const inject = ['layout', 'slots']

/**
 * Client plugin body: start the frame controller, then register the nav bar
 * into the shell overlay once the frame declares it.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const controller = new MobileFrameController()
  ctx.effect(() => {
    controller.start()
    return () => controller.stop()
  }, 'ui-mobile: frame stabilization + viewport tier')

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
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
  }, MobileNav))
}
