/**
 * Drawer scrim: the tap-outside-to-close layer for the open sidebar drawer,
 * registered into the frame's `shell.overlay` list slot. Rendered only at
 * phone tier while the sidebar is expanded; tapping it collapses the drawer.
 * Pure presentation — state arrives through the inject face.
 */
import { useEffect, useState } from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { MobileNavState } from './frame.ts'
import css from './DrawerScrim.module.css'

/** The inject face the mobile plugin's registration hands this component. */
export interface DrawerScrimInjected {
  /** Toggle the sidebar drawer (expand when collapsed, collapse when expanded). */
  toggleSidebar(): void
  /** Subscribe to mobile-frame state changes; returns the unsubscriber. */
  subscribe(listener: () => void): () => void
  /** Latest mobile-frame state snapshot. */
  snapshot(): MobileNavState
}

/** Full composed props: the shell.overlay runtime share + the inject face. */
export type DrawerScrimProps = PropsRuntime<'shell.overlay'> & DrawerScrimInjected

/**
 * Render the drawer scrim (or nothing).
 * @param props - the inject face.
 * @returns the scrim element while the sidebar is open on phones; null otherwise.
 */
export function DrawerScrim({ toggleSidebar, subscribe, snapshot }: DrawerScrimProps) {
  const [state, setState] = useState<MobileNavState>(() => snapshot())
  useEffect(() => subscribe(() => setState(snapshot())), [subscribe, snapshot])
  if (!state.mobile || !state.sidebarOpen) return null
  return (
    <button type="button" className={css.scrim} aria-label="关闭面板" onClick={toggleSidebar} />
  )
}
