import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PushController, PushState } from './push.ts'
import css from './PushPrompt.module.css'

export interface PushPromptInjected { push: PushController }

/** Explicit user-gesture entry for the browser notification permission prompt. */
export function PushPrompt({ push }: PushPromptInjected) {
  const [state, setState] = useState<PushState>(() => push.snapshot())
  useEffect(() => push.subscribe(() => setState(push.snapshot())), [push])
  // iOS only permits Web Push from a Home Screen web app. Do not turn that
  // platform constraint into persistent chrome for people who prefer using
  // the site in Safari; the install guidance has its own, dismissible banner.
  if (state.subscribed || !state.installed || typeof document === 'undefined') return null
  let content: JSX.Element
  if (!state.available) content = <output className={css.notice}>当前 iOS Web App 不支持通知</output>
  else if (!state.enabled) content = <output className={css.notice}>通知服务正在连接，请稍候刷新</output>
  else if (state.permission === 'denied') content = <output className={css.notice}>通知已被系统关闭，请在设置中允许</output>
  else content = <button type="button" className={css.button} onClick={() => { void push.enable() }}>
    {state.permission === 'granted' ? '启用任务完成通知' : '开启任务完成通知'}
  </button>
  // The shell overlay intentionally sits beneath some workspace chrome; a
  // portal puts this iOS-only action above the composer and its safe-area bar.
  return createPortal(content, document.body)
}
