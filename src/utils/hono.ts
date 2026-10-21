import {Hono, type Context as HonoContext} from "hono"

export type Bindings = Env & {
    BLUESKY_IDENTIFIER?: string
    BLUESKY_APP_PASSWORD?: string
    BLUESKY_SERVICE_URL?: string
    DISCORD_WEBHOOK_URL?: string
    MASTODON_INSTANCE?: string
    MASTODON_ACCESS_TOKEN?: string
    TELEGRAM_CHAT_ID?: string
}

export type Context = HonoContext<{Bindings: Bindings}>

export default () => new Hono<{Bindings: Bindings}>()
