/**
 * Header menu button: the phone-tier sidebar toggle registered into the
 * session header's left-of-title strip (`conversation.session.header.left`).
 * Icon-only (the label rides aria), hidden on desktop where the sidebar has
 * its own collapse affordances. Pure presentation: state arrives through the
 * inject face (toggle + the frame controller's subscribe/snapshot pair).
 */
import { useEffect, useState } from 'react'
import { IconPanelLeftOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { MobileNavState } from './frame.ts'
import css from './HeaderMenuButton.module.css'

/** The inject face the mobile plugin's registration hands this component. */
export interface HeaderMenuButtonInjected {
  /** Toggle the sidebar drawer (expand when collapsed, collapse when expanded). */
  toggleSidebar(): void
  /** Subscribe to mobile-frame state changes; returns the unsubscriber. */
  subscribe(listener: () => void): () => void
  /** Latest mobile-frame state snapshot. */
  snapshot(): MobileNavState
}

/** Full composed props: the header.left runtime share + the inject face. */
export type HeaderMenuButtonProps = PropsRuntime<'conversation.session.header.left'> & HeaderMenuButtonInjected

/**
 * Render the header menu toggle (icon only).
 * @param props - the inject face.
 * @returns the toggle button element.
 */
export function HeaderMenuButton({ toggleSidebar, subscribe, snapshot }: HeaderMenuButtonProps) {
  const [state, setState] = useState<MobileNavState>(() => snapshot())
  useEffect(() => subscribe(() => setState(snapshot())), [subscribe, snapshot])
  return (
    <button
      type="button"
      className={css.button}
      aria-pressed={state.sidebarOpen}
      aria-label="菜单"
      onClick={toggleSidebar}
    >
      <IconPanelLeftOutline16 />
    </button>
  )
}
