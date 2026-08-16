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

  it('node-half apply is a no-op host placeholder', () => {
    apply()
    expect(true).toBe(true) // reaching here without throw is the contract
  })
})
