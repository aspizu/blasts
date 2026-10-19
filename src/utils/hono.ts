import {Hono, type Context as HonoContext} from "hono"

export type Bindings = Env & {
    DISCORD_WEBHOOK_URL?: string
    TELEGRAM_CHAT_ID?: string
}

export type Context = HonoContext<{Bindings: Bindings}>

export default () => new Hono<{Bindings: Bindings}>()
