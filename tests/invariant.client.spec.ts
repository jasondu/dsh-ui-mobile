/**
 * ui-mobile invariant companion and node-half placeholder contract.
 */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { apply } from '../src/index.ts'
import * as MobileInvariant from '../src/invariant.ts'

describe('invariant companion', () => {
  it('registers under the package name with an empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await expect(ctx.plugin(MobileInvariant).await()).resolves.toBeDefined()
  })

  it('node-half apply wires the webserver surface without throwing', () => {
    const ctx = {
      inject(services: string[], callback: (scope: unknown) => void): void {
        if (services.includes('webServer')) callback({
          effect(run: () => unknown): void { run() },
          webServer: {
            register: () => () => {},
            tapIndex: () => () => {},
          },
        })
      },
    } as unknown as Context
    expect(() => apply(ctx)).not.toThrow()
  })
})
