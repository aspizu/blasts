import {zValidator} from "@hono/zod-validator"
import {z} from "zod"

import {createBlast} from "#api/blasts"
import hono from "#utils/hono"

const message = z.object({
    chat: z.object({id: z.int()}),
    text: z.string().optional(),
})

const body = z.object({
    update_id: z.int().nonnegative(),
    message: message.optional(),
    channel_post: message.optional(),
})

export default hono().post(
    "/webhooks/telegram",
    zValidator("json", body),
    async (c) => {
        const update = c.req.valid("json")
        const message = update.message ?? update.channel_post
        if (!message?.text || String(message.chat.id) !== c.env.TELEGRAM_CHAT_ID) {
            return c.json({ok: true})
        }
        await createBlast(c, message.text, `telegram:update:${update.update_id}`)
        return c.json({ok: true})
    },
)
