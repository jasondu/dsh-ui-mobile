// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BackToBottom } from '../src/client/BackToBottom.tsx'
import type { MobileFrameController } from '../src/client/frame.ts'

const frame = { snapshot: () => ({ mobile: true, sidebarOpen: false, detailsOpen: false }), subscribe: () => () => {} } as unknown as MobileFrameController
afterEach(() => { cleanup(); document.body.replaceChildren() })
describe('BackToBottom', () => {
  it('uses its own button to set the conversation scrollport to the bottom', async () => {
    const port = document.createElement('div')
    port.dataset.conversationScroll = ''
    Object.defineProperties(port, { scrollHeight: { value: 900 }, clientHeight: { value: 300 }, scrollTop: { value: 100, writable: true } })
    document.body.append(port)
    render(<BackToBottom frame={frame} />)
    await new Promise(resolve => setTimeout(resolve, 0))
    fireEvent.click(screen.getByRole('button', { name: '回到底部' }))
    expect(port.scrollTop).toBe(900)
  })
})
