// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConversationNavigator } from '../src/client/ConversationNavigator.tsx'
import type { ConversationNavigatorController, ConversationNavigatorState } from '../src/client/conversation-navigator.ts'
import type { MobileFrameController, MobileNavState } from '../src/client/frame.ts'

function navigatorFace(state: ConversationNavigatorState) {
  return {
    snapshot: () => state,
    subscribe: () => () => {},
    jumpTo: vi.fn(),
  } as unknown as ConversationNavigatorController
}

function frameFace(state: MobileNavState) {
  return { snapshot: () => state, subscribe: () => () => {} } as unknown as MobileFrameController
}

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
})

describe('ConversationNavigator', () => {
  it('starts as a compact rail and expands into user-message summaries', () => {
    const first = document.createElement('div')
    const second = document.createElement('div')
    const navigator = navigatorFace({
      activeKey: 'second',
      awayFromBottom: true,
      waypoints: [
        { key: 'first', summary: '第一条需求', element: first },
        { key: 'second', summary: '第二条需求', element: second },
      ],
    })
    render(<ConversationNavigator navigator={navigator} frame={frameFace({ mobile: true, sidebarOpen: false, detailsOpen: false })} />)
    expect(screen.queryByLabelText('用户消息列表')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /展开会话导览/ }))
    expect(screen.getByText('第一条需求')).toBeTruthy()
    const secondItem = screen.getByText('第二条需求').closest('button')!
    expect(secondItem.getAttribute('aria-current')).toBe('true')
    fireEvent.click(secondItem)
    expect((navigator as unknown as { jumpTo: ReturnType<typeof vi.fn> }).jumpTo).toHaveBeenCalledWith('second')
    expect(screen.queryByLabelText('用户消息列表')).toBeNull()
  })

  it('stays absent until there are at least two user messages', () => {
    const navigator = navigatorFace({ activeKey: 'first', awayFromBottom: true, waypoints: [{ key: 'first', summary: '第一条', element: document.createElement('div') }] })
    render(<ConversationNavigator navigator={navigator} frame={frameFace({ mobile: true, sidebarOpen: false, detailsOpen: false })} />)
    expect(screen.queryByLabelText('会话导览')).toBeNull()
  })

  it('stays hidden while the reader is already at the bottom', () => {
    const navigator = navigatorFace({ activeKey: 'second', awayFromBottom: false, waypoints: [
      { key: 'first', summary: '第一条', element: document.createElement('div') },
      { key: 'second', summary: '第二条', element: document.createElement('div') },
    ] })
    render(<ConversationNavigator navigator={navigator} frame={frameFace({ mobile: true, sidebarOpen: false, detailsOpen: false })} />)
    expect(screen.queryByLabelText('会话导览')).toBeNull()
  })
})
