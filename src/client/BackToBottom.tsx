import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { MobileFrameController, MobileNavState } from './frame.ts'
import css from './BackToBottom.module.css'

export interface BackToBottomInjected { frame: MobileFrameController }
export type BackToBottomProps = PropsRuntime<'shell.overlay'> & BackToBottomInjected

const THRESHOLD = 24
function isAwayFromBottom(port: HTMLElement): boolean { return port.scrollHeight - port.scrollTop - port.clientHeight > THRESHOLD }

/** Plugin-owned bottom jump avoids the host sticky button's fixed-composer conflict. */
export function BackToBottom({ frame }: BackToBottomProps) {
  const [frameState, setFrameState] = useState<MobileNavState>(() => frame.snapshot())
  const [visible, setVisible] = useState(false)
  const [scrollport, setScrollport] = useState<HTMLElement | null>(null)
  useEffect(() => frame.subscribe(() => setFrameState(frame.snapshot())), [frame])
  useEffect(() => {
    let current: HTMLElement | null = null
    const read = () => { if (current !== null) setVisible(isAwayFromBottom(current)) }
    const attach = () => {
      const next = document.querySelector<HTMLElement>('[data-conversation-scroll]')
      if (next === current) return
      current?.removeEventListener('scroll', read)
      current = next
      current?.addEventListener('scroll', read, { passive: true })
      setScrollport(current)
      read()
    }
    const observer = new MutationObserver(attach)
    observer.observe(document.body, { childList: true, subtree: true })
    attach()
    return () => { observer.disconnect(); current?.removeEventListener('scroll', read) }
  }, [])
  if (!frameState.mobile || frameState.sidebarOpen || !visible || scrollport === null || typeof document === 'undefined') return null
  return createPortal(
    <button type="button" className={css.button} aria-label="回到底部" onClick={() => { scrollport.scrollTop = scrollport.scrollHeight }}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>,
    document.body,
  )
}
