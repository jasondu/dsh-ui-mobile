/** A single ordinary user-message waypoint in the visible conversation. */
export interface ConversationWaypoint {
  readonly key: string
  readonly summary: string
  readonly element: HTMLElement
}

export interface ConversationNavigatorState {
  readonly waypoints: readonly ConversationWaypoint[]
  readonly activeKey: string | null
  /** Mirrors the plugin-owned return-to-bottom button's visibility gate. */
  readonly awayFromBottom: boolean
}

const USER_MESSAGE_SELECTOR = '[data-chat-flow-kind="user"][data-chat-anchor-key]'
const SCROLL_SELECTOR = '[data-conversation-scroll]'
const SUMMARY_LIMIT = 48
const BOTTOM_THRESHOLD = 24

function isAwayFromBottom(scrollport: HTMLElement | null): boolean {
  return scrollport !== null && scrollport.scrollHeight - scrollport.scrollTop - scrollport.clientHeight > BOTTOM_THRESHOLD
}

function summarize(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length <= SUMMARY_LIMIT) return compact || '未命名消息'
  return `${compact.slice(0, SUMMARY_LIMIT - 1)}…`
}

/** Collect only ordinary turn-opening user messages; steering messages stay out. */
export function collectConversationWaypoints(root: ParentNode = document): ConversationWaypoint[] {
  return [...root.querySelectorAll<HTMLElement>(USER_MESSAGE_SELECTOR)].flatMap(element => {
    const key = element.dataset.chatAnchorKey
    if (key === undefined || key === '') return []
    return [{ key, summary: summarize(element.textContent ?? ''), element }]
  })
}

/** Pick the last waypoint that has reached the reading line in the scrollport. */
export function activeConversationWaypoint(
  waypoints: readonly ConversationWaypoint[], scrollport: HTMLElement | null,
): string | null {
  if (waypoints.length === 0) return null
  if (scrollport === null) return waypoints[0]!.key
  const readingLine = scrollport.getBoundingClientRect().top + Math.min(120, scrollport.clientHeight * 0.28)
  let active = waypoints[0]!.key
  for (const waypoint of waypoints) {
    if (waypoint.element.getBoundingClientRect().top <= readingLine) active = waypoint.key
    else break
  }
  return active
}

/**
 * Observes the host transcript without relying on its CSS-module class names.
 * It tracks the stable chat node attributes and exposes a small reactive
 * snapshot for the overlay UI.
 */
export class ConversationNavigatorController {
  private readonly listeners = new Set<() => void>()
  private mutationObserver: MutationObserver | null = null
  private scrollport: HTMLElement | null = null
  private state: ConversationNavigatorState = { waypoints: [], activeKey: null, awayFromBottom: false }
  private readonly onMutation = (): void => { this.refresh() }
  private readonly onScroll = (): void => { this.refreshActive() }

  snapshot(): ConversationNavigatorState { return this.state }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  start(): void {
    this.mutationObserver = new MutationObserver(this.onMutation)
    this.mutationObserver.observe(document.body, { childList: true, subtree: true, characterData: true })
    window.addEventListener('resize', this.onScroll)
    this.refresh()
  }

  stop(): void {
    this.mutationObserver?.disconnect()
    this.mutationObserver = null
    this.scrollport?.removeEventListener('scroll', this.onScroll)
    this.scrollport = null
    window.removeEventListener('resize', this.onScroll)
    this.listeners.clear()
  }

  refresh(): void {
    const nextScrollport = document.querySelector<HTMLElement>(SCROLL_SELECTOR)
    if (nextScrollport !== this.scrollport) {
      this.scrollport?.removeEventListener('scroll', this.onScroll)
      this.scrollport = nextScrollport
      this.scrollport?.addEventListener('scroll', this.onScroll, { passive: true })
    }
    const waypoints = collectConversationWaypoints()
    const activeKey = activeConversationWaypoint(waypoints, this.scrollport)
    this.setState({ waypoints, activeKey, awayFromBottom: isAwayFromBottom(this.scrollport) })
  }

  refreshActive(): void {
    const activeKey = activeConversationWaypoint(this.state.waypoints, this.scrollport)
    const awayFromBottom = isAwayFromBottom(this.scrollport)
    if (activeKey !== this.state.activeKey || awayFromBottom !== this.state.awayFromBottom) {
      this.setState({ ...this.state, activeKey, awayFromBottom })
    }
  }

  jumpTo(key: string): void {
    const target = this.state.waypoints.find(waypoint => waypoint.key === key)?.element
    if (target === undefined) return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }

  private setState(next: ConversationNavigatorState): void {
    const same = next.activeKey === this.state.activeKey
      && next.awayFromBottom === this.state.awayFromBottom
      && next.waypoints.length === this.state.waypoints.length
      && next.waypoints.every((waypoint, index) => waypoint.key === this.state.waypoints[index]?.key && waypoint.summary === this.state.waypoints[index]?.summary)
    if (same) return
    this.state = next
    for (const listener of this.listeners) listener()
  }
}
