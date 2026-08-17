/**
 * Left-top drawer control for the no-session and blank-session hero. The
 * conversation header deliberately hides in those states, so its session
 * slot cannot provide the ordinary mobile menu button.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconPanelLeftOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { MobileNavState } from './frame.ts'
import css from './NewSessionMenuButton.module.css'

export interface NewSessionMenuButtonInjected {
  toggleSidebar(): void
  subscribe(listener: () => void): () => void
  snapshot(): MobileNavState
}

export type NewSessionMenuButtonProps = PropsRuntime<'shell.overlay'> & NewSessionMenuButtonInjected

/** Render the menu only while the regular conversation header is absent. */
export function NewSessionMenuButton({
  toggleSidebar, subscribe, snapshot, useSessions,
}: NewSessionMenuButtonProps) {
  const [state, setState] = useState<MobileNavState>(() => snapshot())
  const showForBlankSession = useSessions(s => s.current === undefined || s.byId[s.current]?.blank === true)
  useEffect(() => subscribe(() => setState(snapshot())), [subscribe, snapshot])
  if (!state.mobile || !showForBlankSession || typeof document === 'undefined') return null
  return createPortal(
    <button
      type="button"
      className={css.button}
      aria-pressed={state.sidebarOpen}
      aria-label="菜单"
      onClick={toggleSidebar}
    >
      <IconPanelLeftOutline16 />
    </button>,
    document.body,
  )
}
