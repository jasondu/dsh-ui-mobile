/**
 * Type declarations for the `dsh-ui-mobile/client` entry (the browser bundle,
 * lib/client.js). Hand-written so the standalone package stays self-contained:
 * the monorepo version generates these from tsc, but here the @deepseek-ai
 * peers may be unavailable at build time. Keep in sync with
 * `src/client/index.ts` and `src/client/frame.ts` when the public face moves.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'

/** Required services: the layout panel actions and the slot registry. */
export declare const inject: readonly ['layout', 'slots']

/**
 * Client plugin body: start the frame controller, then register the nav bar
 * into the shell overlay once the frame declares it.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void

/** Reactive mobile view state (see per-field docs). */
export interface MobileNavState {
  /** True when the viewport is at phone tier (max-width: 767px). */
  mobile: boolean
  /** True when the sidebar drawer is expanded. */
  sidebarOpen: boolean
  /** True when the details drawer is expanded. */
  detailsOpen: boolean
}

/** The inject face the mobile plugin's registration hands the nav bar. */
export interface MobileNavInjected {
  /** Toggle the sidebar drawer (expand when collapsed, collapse when expanded). */
  toggleSidebar(): void
  /** Toggle the details drawer (open when closed, close when open). */
  toggleDetails(): void
  /** Subscribe to mobile-frame state changes; returns the unsubscriber. */
  subscribe(listener: () => void): () => void
  /** Latest mobile-frame state snapshot. */
  snapshot(): MobileNavState
}
