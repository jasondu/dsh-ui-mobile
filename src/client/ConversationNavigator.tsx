import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConversationNavigatorController, ConversationNavigatorState } from './conversation-navigator.ts'
import type { MobileFrameController, MobileNavState } from './frame.ts'
import css from './ConversationNavigator.module.css'

export interface ConversationNavigatorInjected {
  navigator: ConversationNavigatorController
  frame: MobileFrameController
}

export type ConversationNavigatorProps = PropsRuntime<'shell.overlay'> & ConversationNavigatorInjected

/** Phone-only user-message outline: a compact rail that expands into summaries. */
export function ConversationNavigator({ navigator, frame }: ConversationNavigatorProps) {
  const [navState, setNavState] = useState<ConversationNavigatorState>(() => navigator.snapshot())
  const [frameState, setFrameState] = useState<MobileNavState>(() => frame.snapshot())
  const [expanded, setExpanded] = useState(false)
  useEffect(() => navigator.subscribe(() => setNavState(navigator.snapshot())), [navigator])
  useEffect(() => frame.subscribe(() => setFrameState(frame.snapshot())), [frame])
  useEffect(() => { if (frameState.sidebarOpen) setExpanded(false) }, [frameState.sidebarOpen])

  if (!frameState.mobile || frameState.sidebarOpen || !navState.awayFromBottom || navState.waypoints.length < 2 || typeof document === 'undefined') return null
  const jump = (key: string) => {
    navigator.jumpTo(key)
    setExpanded(false)
  }
  return createPortal(
    <aside className={css.root} aria-label="会话导览">
      <button
        type="button"
        className={css.rail}
        aria-expanded={expanded}
        aria-label={expanded ? '收起会话导览' : `展开会话导览，共 ${navState.waypoints.length} 条消息`}
        onClick={() => setExpanded(value => !value)}
      >
        {navState.waypoints.map((waypoint, index) => (
          <span key={waypoint.key} className={css.tick} data-active={waypoint.key === navState.activeKey || undefined} aria-hidden="true">
            <span className={css.tickLabel}>{index + 1}</span>
          </span>
        ))}
      </button>
      {expanded && (
        <section className={css.panel} aria-label="用户消息列表">
          {navState.waypoints.map((waypoint, index) => (
            <button
              key={waypoint.key}
              type="button"
              className={css.item}
              data-active={waypoint.key === navState.activeKey || undefined}
              aria-current={waypoint.key === navState.activeKey ? 'true' : undefined}
              onClick={() => jump(waypoint.key)}
            >
              <span className={css.number}>{index + 1}</span>
              <span className={css.summary}>{waypoint.summary}</span>
            </button>
          ))}
        </section>
      )}
    </aside>,
    document.body,
  )
}
