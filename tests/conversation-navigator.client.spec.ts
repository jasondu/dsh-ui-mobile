// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ConversationNavigatorController, activeConversationWaypoint, collectConversationWaypoints,
} from '../src/client/conversation-navigator.ts'

function waypoint(key: string, text: string, kind = 'user'): HTMLElement {
  const element = document.createElement('div')
  element.dataset.chatFlowKind = kind
  element.dataset.chatAnchorKey = key
  element.textContent = text
  document.body.append(element)
  return element
}

function scrollport(): HTMLElement {
  const element = document.createElement('div')
  element.dataset.conversationScroll = ''
  document.body.append(element)
  return element
}

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('conversation navigator', () => {
  it('collects only ordinary user messages and derives compact summaries', () => {
    waypoint('first', '  第一条\n  用户消息  ')
    waypoint('steering', '运行中的插话', 'steering')
    waypoint('second', '第二条用户消息')
    expect(collectConversationWaypoints().map(({ key, summary }) => ({ key, summary }))).toEqual([
      { key: 'first', summary: '第一条 用户消息' },
      { key: 'second', summary: '第二条用户消息' },
    ])
  })

  it('chooses the last waypoint above the reading line', () => {
    const port = scrollport()
    Object.defineProperty(port, 'clientHeight', { value: 400 })
    vi.spyOn(port, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect)
    const first = waypoint('first', '第一条')
    const second = waypoint('second', '第二条')
    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue({ top: 80 } as DOMRect)
    vi.spyOn(second, 'getBoundingClientRect').mockReturnValue({ top: 180 } as DOMRect)
    expect(activeConversationWaypoint(collectConversationWaypoints(), port)).toBe('first')
  })

  it('tracks mutations and scrolls to the selected user message', async () => {
    const port = scrollport()
    Object.defineProperties(port, { scrollHeight: { value: 900 }, clientHeight: { value: 300 }, scrollTop: { value: 100, writable: true } })
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    const first = waypoint('first', '第一条')
    const scrollIntoView = vi.fn()
    Object.defineProperty(first, 'scrollIntoView', { value: scrollIntoView })
    const controller = new ConversationNavigatorController()
    controller.start()
    expect(controller.snapshot().waypoints.map(waypoint => waypoint.key)).toEqual(['first'])
    expect(controller.snapshot().awayFromBottom).toBe(true)
    waypoint('steering', '插话', 'steering')
    waypoint('second', '第二条')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(controller.snapshot().waypoints.map(waypoint => waypoint.key)).toEqual(['first', 'second'])
    controller.jumpTo('first')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    controller.stop()
  })
})
