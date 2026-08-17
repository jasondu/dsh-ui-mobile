export interface PushState { available: boolean; enabled: boolean; permission: NotificationPermission; subscribed: boolean; installed: boolean }

type OpenSession = (sessionId: string) => void

/** Browser-side VAPID subscription and notification-click router. */
export class PushController {
  private state: PushState = { available: false, enabled: false, permission: 'default', subscribed: false, installed: false }
  private readonly listeners = new Set<() => void>()
  private readonly onMessage = (event: MessageEvent<unknown>): void => {
    const data = event.data
    if (typeof data !== 'object' || data === null || !('type' in data) || data.type !== 'dsh-push-open') return
    const sessionId = (data as { sessionId?: unknown }).sessionId
    if (typeof sessionId === 'string') this.openSession(sessionId)
  }

  constructor(private readonly openSession: OpenSession) {}
  snapshot(): PushState { return this.state }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener) }

  async start(): Promise<void> {
    const installed = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      this.setState({ installed })
      return
    }
    navigator.serviceWorker.addEventListener('message', this.onMessage)
    try {
      const response = await fetch('/pwa/push/config')
      const config = await response.json() as { enabled?: unknown }
      const enabled = config.enabled === true
      const registration = enabled ? await navigator.serviceWorker.ready : undefined
      const subscription = registration === undefined ? null : await registration.pushManager.getSubscription()
      // Reconcile a browser-held subscription after a server restore or a
      // subscription-store migration. The endpoint map is idempotent.
      if (subscription !== null) {
        await fetch('/pwa/push/subscription', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(subscription),
        })
      }
      const subscribed = subscription !== null
      this.setState({ available: true, enabled, permission: Notification.permission, subscribed, installed })
    } catch { this.setState({ available: true, permission: Notification.permission, installed }) }
  }

  stop(): void { navigator.serviceWorker?.removeEventListener('message', this.onMessage); this.listeners.clear() }

  async enable(): Promise<void> {
    if (!this.state.enabled || Notification.permission === 'denied') return
    const permission = await Notification.requestPermission()
    this.setState({ permission })
    if (permission !== 'granted') return
    const config = await (await fetch('/pwa/push/config')).json() as { publicKey?: unknown }
    if (typeof config.publicKey !== 'string') return
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
      ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64Url(config.publicKey) })
    const response = await fetch('/pwa/push/subscription', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(subscription) })
    if (!response.ok) throw new Error(`Push subscription failed: ${response.status}`)
    this.setState({ permission: 'granted', subscribed: true })
  }

  private setState(next: Partial<PushState>): void {
    const merged = { ...this.state, ...next }
    if (merged.available === this.state.available && merged.enabled === this.state.enabled && merged.permission === this.state.permission && merged.subscribed === this.state.subscribed && merged.installed === this.state.installed) return
    this.state = merged
    for (const listener of this.listeners) listener()
  }
}

function base64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4)
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0))
}
