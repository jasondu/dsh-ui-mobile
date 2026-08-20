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
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import { MobileFrameController } from './frame.ts'
import { EdgeSwipeController } from './edge-swipe.ts'
import { InstallController } from './install.ts'
import { InstallBanner, type InstallBannerInjected } from './InstallBanner.tsx'
import { HeaderMenuButton, type HeaderMenuButtonInjected } from './HeaderMenuButton.tsx'
import { NewSessionMenuButton, type NewSessionMenuButtonInjected } from './NewSessionMenuButton.tsx'
import { ConversationNavigator, type ConversationNavigatorInjected } from './ConversationNavigator.tsx'
import { BackToBottom, type BackToBottomInjected } from './BackToBottom.tsx'
import { DrawerScrim, type DrawerScrimInjected } from './DrawerScrim.tsx'
import { registerServiceWorker } from './sw.ts'
import { suppressCommandPanelScriptFocus } from './command-focus.ts'
import { enableMobileEnterSend } from './mobile-enter-send.ts'
import { lockMobilePageZoom } from './page-zoom-lock.ts'
import { PushController } from './push.ts'
import { PushPrompt, type PushPromptInjected } from './PushPrompt.tsx'
import { ConversationNavigatorController } from './conversation-navigator.ts'
import './mobile.module.css'

export type { HeaderMenuButtonInjected } from './HeaderMenuButton.tsx'
export type { NewSessionMenuButtonInjected } from './NewSessionMenuButton.tsx'
export type { ConversationNavigatorInjected } from './ConversationNavigator.tsx'
export type { BackToBottomInjected } from './BackToBottom.tsx'
export type { DrawerScrimInjected } from './DrawerScrim.tsx'
export type { MobileNavState } from './frame.ts'
export type { InstallBannerInjected } from './InstallBanner.tsx'
export type { InstallState } from './install.ts'
export type { PushPromptInjected } from './PushPrompt.tsx'

/** Required services: the layout panel actions and the slot registry. */
export const inject = ['layout', 'slots', 'sessions']

/**
 * Client plugin body: register the app-shell service worker, start the frame
 * and install controllers, then register the header menu toggle, the drawer
 * scrim, and the install banner once their slots are declared.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  registerServiceWorker()
  const controller = new MobileFrameController()
  const edgeSwipe = new EdgeSwipeController(controller, () => ctx.layout.toggleSidebar())
  const navigator = new ConversationNavigatorController()
  const install = new InstallController()
  const push = new PushController(sessionId => { ctx.sessions.open(sessionId as never) })
  ctx.effect(() => {
    controller.start()
    edgeSwipe.start()
    navigator.start()
    install.start()
    void push.start()
    return () => {
      controller.stop()
      edgeSwipe.stop()
      navigator.stop()
      install.stop()
      push.stop()
    }
  }, 'ui-mobile: frame stabilization + install controller')

  // Command-panel keyboard guard: phone tier only, so it never disturbs the
  // desktop combobox behavior; see command-focus.ts.
  ctx.effect(() => suppressCommandPanelScriptFocus(), 'ui-mobile: command panel keyboard guard')
  ctx.effect(() => enableMobileEnterSend(), 'ui-mobile: keyboard send action')
  ctx.effect(() => lockMobilePageZoom(), 'ui-mobile: page zoom lock')

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
    const registerNewSessionMenu = ctx.slots.register({
      name: 'shell.overlay', id: 'mobile-new-session-menu', order: 89, label: '新会话菜单',
      inject: (): NewSessionMenuButtonInjected => drawerControls(),
    }, NewSessionMenuButton)
    const registerConversationNavigator = ctx.slots.register({
      name: 'shell.overlay', id: 'mobile-conversation-navigator', order: 88, label: '会话导览',
      inject: (): ConversationNavigatorInjected => ({ navigator, frame: controller }),
    }, ConversationNavigator)
    const registerBackToBottom = ctx.slots.register({
      name: 'shell.overlay', id: 'mobile-back-to-bottom', order: 87, label: '回到底部',
      inject: (): BackToBottomInjected => ({ frame: controller }),
    }, BackToBottom)
    const registerBanner = ctx.slots.register({
      name: 'shell.overlay',
      id: 'mobile-install',
      order: 90,
      label: 'PWA 安装引导',
      inject: (): InstallBannerInjected => ({
        snapshot: () => install.snapshot(),
        subscribe: listener => install.subscribe(listener),
        install: () => install.install(),
        dismissInstallPromotion: () => install.dismissInstallPromotion(),
      }),
    }, InstallBanner)
    const registerPushPrompt = ctx.slots.register({
      name: 'shell.overlay', id: 'mobile-push-prompt', order: 91, label: '开启完成通知',
      inject: (): PushPromptInjected => ({ push }),
    }, PushPrompt)
    return () => {
      registerScrim()
      registerNewSessionMenu()
      registerConversationNavigator()
      registerBackToBottom()
      registerBanner()
      registerPushPrompt()
    }
  })
}
