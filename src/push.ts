import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import webpush, { type PushSubscription } from 'web-push'

const STORE_PATH = process.env.DSH_WEB_PUSH_STORE_PATH ?? join(process.cwd(), '.dsh-ui-mobile', 'push-subscriptions.json')
const VAPID_PATH = process.env.DSH_WEB_PUSH_VAPID_PATH

export interface PushConfig { enabled: boolean; publicKey?: string }

interface VapidDetails { subject: string; publicKey: string; privateKey: string }

/** Resolve explicit environment credentials or their secure persistent file. */
function loadVapid(): VapidDetails | undefined {
  const env = {
    subject: process.env.DSH_WEB_PUSH_VAPID_SUBJECT,
    publicKey: process.env.DSH_WEB_PUSH_VAPID_PUBLIC_KEY,
    privateKey: process.env.DSH_WEB_PUSH_VAPID_PRIVATE_KEY,
  }
  const supplied = [env.subject, env.publicKey, env.privateKey].filter(value => value !== undefined).length
  if (supplied !== 0 && supplied !== 3) throw new Error('Web Push VAPID configuration requires subject, public key, and private key together')
  const explicit = supplied === 3 ? env as VapidDetails : undefined
  if (VAPID_PATH === undefined) return explicit
  if (explicit !== undefined) {
    mkdirSync(dirname(VAPID_PATH), { recursive: true, mode: 0o700 })
    const next = `${VAPID_PATH}.next`
    writeFileSync(next, JSON.stringify(explicit), { mode: 0o600 })
    renameSync(next, VAPID_PATH)
    return explicit
  }
  if (!existsSync(VAPID_PATH)) return undefined
  const saved = JSON.parse(readFileSync(VAPID_PATH, 'utf8')) as Partial<VapidDetails>
  if (typeof saved.subject !== 'string' || typeof saved.publicKey !== 'string' || typeof saved.privateKey !== 'string') {
    throw new Error(`Web Push VAPID file is invalid: ${VAPID_PATH}`)
  }
  return saved as VapidDetails
}

/** Durable VAPID sender and subscription registry owned by this plugin host. */
export class PushService {
  private readonly vapid = loadVapid()
  private readonly publicKey = this.vapid?.publicKey
  private readonly privateKey = this.vapid?.privateKey
  private readonly subject = this.vapid?.subject
  private subscriptions = new Map<string, PushSubscription>()
  private loaded = false

  constructor() {
    if (this.enabled()) webpush.setVapidDetails(this.subject!, this.publicKey!, this.privateKey!)
  }

  enabled(): boolean { return this.publicKey !== undefined && this.privateKey !== undefined && this.subject !== undefined }

  config(): PushConfig { return this.enabled() ? { enabled: true, publicKey: this.publicKey } : { enabled: false } }

  async subscribe(subscription: PushSubscription): Promise<void> {
    await this.load()
    this.subscriptions.set(subscription.endpoint, subscription)
    await this.save()
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.load()
    if (!this.subscriptions.delete(endpoint)) return
    await this.save()
  }

  /** Deliver a successful-turn notification, removing subscriptions rejected by their push service. */
  async notify(sessionId: string): Promise<void> {
    if (!this.enabled()) return
    await this.load()
    const payload = JSON.stringify({ title: 'Agent 已完成', body: '任务已成功完成，点按查看会话。', sessionId })
    let changed = false
    await Promise.all([...this.subscriptions.values()].map(async subscription => {
      try {
        await webpush.sendNotification(subscription, payload, { TTL: 60 * 60 })
      } catch (error: unknown) {
        const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
          ? (error as { statusCode?: unknown }).statusCode : undefined
        if (statusCode === 404 || statusCode === 410) {
          this.subscriptions.delete(subscription.endpoint)
          changed = true
        }
      }
    }))
    if (changed) await this.save()
  }

  private async load(): Promise<void> {
    if (this.loaded) return
    this.loaded = true
    try {
      const saved = JSON.parse(await readFile(STORE_PATH, 'utf8')) as PushSubscription[]
      for (const item of saved) if (typeof item.endpoint === 'string') this.subscriptions.set(item.endpoint, item)
    } catch (error: unknown) {
      if ((error as { code?: string }).code !== 'ENOENT') throw error
    }
  }

  private async save(): Promise<void> {
    await mkdir(dirname(STORE_PATH), { recursive: true })
    const next = `${STORE_PATH}.next`
    await writeFile(next, JSON.stringify([...this.subscriptions.values()]), { mode: 0o600 })
    await rename(next, STORE_PATH)
  }
}
