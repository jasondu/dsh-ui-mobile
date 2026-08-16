/**
 * Mobile nav bar: the phone-tier control surface registered into the frame's
 * `shell.overlay` list slot. A fixed bottom bar with two thumb-reachable
 * buttons — sidebar drawer and details drawer — plus a scrim behind an open
 * drawer that closes it on tap. Pure presentation: all state arrives through
 * the inject face (toggle callbacks + a subscribe/snapshot pair over the
 * MobileFrameController), and session presence through the framework's
 * `useSessions` global seat; the component owns no business state beyond the
 * mirror of that snapshot.
 */
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import {
  IconInspectOutline12,
  IconPanelLeftOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { MobileNavState } from './frame.ts'
import css from './MobileNav.module.css'

/** The inject face the mobile plugin's registration hands this component. */
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

/** Full composed props: the shell.overlay runtime share + the inject face. */
export type MobileNavProps = PropsRuntime<'shell.overlay'> & MobileNavInjected

/**
 * Render the phone-tier nav bar (and its drawer scrim).
 * @param props - runtime share plus the inject face.
 * @returns the nav bar element tree; empty on desktop where CSS hides it.
 */
export function MobileNav({
  toggleSidebar,
  toggleDetails,
  subscribe,
  snapshot,
  useSessions,
}: MobileNavProps) {
  const [state, setState] = useState<MobileNavState>(() => snapshot())
  useEffect(() => subscribe(() => setState(snapshot())), [subscribe, snapshot])
  const sessions = useSessions(s => s)
  const hasSession = sessions.current !== undefined
  const mobile = state.mobile
  const drawerOpen = mobile && (state.sidebarOpen || state.detailsOpen)
  const closeDrawers = (): void => {
    // The scrim sits below the drawers, so it closes whichever are open.
    if (state.sidebarOpen) toggleSidebar()
    if (state.detailsOpen) toggleDetails()
  }
  const detailsButton = mobile && hasSession ? (
    <button
      type="button"
      className={css.button}
      aria-pressed={state.detailsOpen}
      onClick={toggleDetails}
    >
      <IconInspectOutline12 />
      <span>详情</span>
    </button>
  ) : null
  return (
    <>
      {drawerOpen && <button type="button" className={css.scrim} aria-label="关闭面板" onClick={closeDrawers} />}
      <nav className={clsx(css.nav, !mobile && css.desktopHidden)} aria-label="移动端导航">
        <button
          type="button"
          className={css.button}
          aria-pressed={state.sidebarOpen}
          onClick={toggleSidebar}
        >
          <IconPanelLeftOutline16 />
          <span>菜单</span>
        </button>
        <span className={css.spacer} />
        {detailsButton}
      </nav>
    </>
  )
}
