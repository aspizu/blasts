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

function _parseBlast(text: string) {
    const [link, ...content] = text.split(/\r?\n/u)
    if (
        !link ||
        !/^(?:https?|gopher|gemini):\/\/\S+$/iu.test(link) ||
        !URL.parse(link)?.hostname
    ) {
        return {text, link: null}
    }
    return {text: content.join("\n").trim() || null, link}
}

export default hono().post(
    "/webhooks/telegram",
    zValidator("json", body),
    async (c) => {
        const update = c.req.valid("json")
        const message = update.message ?? update.channel_post
        if (
            !message?.text ||
            message.text === "/start" ||
            String(message.chat.id) !== c.env.TELEGRAM_CHAT_ID
        ) {
            return c.json({ok: true})
        }
        const {text, link} = _parseBlast(message.text)
        await createBlast(c, text, link, `telegram:update:${update.update_id}`)
        return c.json({ok: true})
    },
)
