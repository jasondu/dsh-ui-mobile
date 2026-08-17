/**
 * PWA install banner: the phone-tier install-promotion surface registered into
 * the frame's `shell.overlay` list slot. Two states, both phone-only:
 * Chrome/Edge Android shows an install CTA while a `beforeinstallprompt` is
 * pending; iOS Safari shows a one-time "add to home screen" hint. Pure
 * presentation — all state arrives through the inject face
 * (snapshot/subscribe + the two actions).
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  IconCloseOutline16,
  IconDownloadOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { InstallState } from './install.ts'
import css from './InstallBanner.module.css'

/** The inject face the mobile plugin's registration hands this component. */
export interface InstallBannerInjected {
  /** Latest install state snapshot. */
  snapshot(): InstallState
  /** Subscribe to install-state changes; returns the unsubscriber. */
  subscribe(listener: () => void): () => void
  /** Run the browser's install UI (no-op without a pending prompt). */
  install(): Promise<void>
  /** Permanently dismiss the add-to-home-screen promotion. */
  dismissInstallPromotion(): void
}

/** Full composed props: the shell.overlay runtime share + the inject face. */
export type InstallBannerProps = PropsRuntime<'shell.overlay'> & InstallBannerInjected

/**
 * Render the phone-tier install banner (or nothing).
 * @param props - the inject face.
 * @returns the banner element tree; null on desktop or when nothing is pending.
 */
export function InstallBanner({ snapshot, subscribe, install, dismissInstallPromotion }: InstallBannerProps) {
  const [state, setState] = useState<InstallState>(() => snapshot())
  useEffect(() => subscribe(() => setState(snapshot())), [subscribe, snapshot])
  if (!state.mobile || typeof document === 'undefined') return null
  if (state.installable) {
    return createPortal(
      <div className={css.banner} role="region" aria-label="安装应用">
        <IconDownloadOutline16 />
        <div className={css.copy}>
          <strong>安装到主屏幕</strong>
          <span>安装后可开启任务完成通知</span>
        </div>
        <button type="button" className={css.action} onClick={() => { void install() }}>
          安装
        </button>
        <button type="button" className={css.iconButton} aria-label="关闭提示" onClick={dismissInstallPromotion}>
          <IconCloseOutline16 />
        </button>
      </div>, document.body,
    )
  }
  if (state.iosHintVisible) {
    return createPortal(
      <div className={css.banner} role="region" aria-label="添加到主屏幕">
        <IconDownloadOutline16 />
        <div className={css.copy}>
          <strong>添加到主屏幕</strong>
          <span>点分享按钮 → 添加后可开启任务完成通知</span>
        </div>
        <button type="button" className={css.iconButton} aria-label="关闭提示" onClick={dismissInstallPromotion}>
          <IconCloseOutline16 />
        </button>
      </div>, document.body,
    )
  }
  return null
}
