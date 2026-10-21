import {zValidator} from "@hono/zod-validator"
import {HTTPException} from "hono/http-exception"
import * as uuid from "uuid"
import {z} from "zod"

import {publish} from "#services/syndication"
import hono, {type Context} from "#utils/hono"
import {fetchTitle} from "#utils/links"
import type {Blast} from "#utils/models"
import sql from "#utils/sql"

const body = z
    .strictObject({
        text: z.string().nullable().default(null),
        link: z
            .url({protocol: /^(?:https?|gopher|gemini)$/iu, hostname: /./u})
            .nullable()
            .default(null),
    })
    .refine(({text, link}) => Boolean(text?.trim() || link), {
        message: "Text or link is required",
        path: ["text"],
    })

const params = z.object({id: z.uuidv7()})

async function _resolveText(text: string | null, link: string | null) {
    if (text?.trim()) {
        return text
    }
    if (link) {
        return (await fetchTitle(link)) || link.replace(/^[a-z]+:\/\//iu, "")
    }
    throw new HTTPException(400, {message: "Text or link is required"})
}

export async function createBlast(
    c: Context,
    text: string | null,
    link: string | null,
    idempotencyKey?: string,
) {
    text = await _resolveText(text, link)
    const now = Date.now()
    const id = uuid.v7({msecs: now})
    const timestamp = new Date(now).toISOString()
    const {meta} = await sql(c)`
        INSERT INTO blasts (id, text, link, published_at, updated_at, idempotency_key)
        VALUES (${id}, ${text}, ${link}, ${timestamp}, ${timestamp}, ${idempotencyKey})
        ON CONFLICT (idempotency_key) DO NOTHING
    `.run()
    if (meta.changes === 0) {
        return null
    }
    publish(c, id, text, link, timestamp)
    return id
}

export default hono()
    .get("/blasts/", async (c) => {
        const {results} = await sql(c)`
            SELECT id, text, link, published_at, updated_at FROM blasts
            ORDER BY id DESC
            LIMIT 1000
        `.all<Blast>()
        return c.json({blasts: results})
    })
    .post("/blasts/", zValidator("json", body), async (c) => {
        const {text, link} = c.req.valid("json")
        const id = await createBlast(c, text, link)
        if (id === null) {
            throw new HTTPException(500, {message: "Failed to create blast"})
        }
        const blast = await sql(c)`
            SELECT id, text, link, published_at, updated_at FROM blasts WHERE id = ${id}
        `.first<Blast>()
        c.header("Location", `/blasts/${id}`)
        return c.json(blast, 201)
    })
    .get("/blasts/:id", zValidator("param", params), async (c) => {
        const {id} = c.req.valid("param")
        const blast = await sql(c)`
            SELECT id, text, link, published_at, updated_at FROM blasts WHERE id = ${id}
        `.first<Blast>()
        if (!blast) {
            throw new HTTPException(404, {message: "Blast not found"})
        }
        return c.json(blast)
    })
    .put(
        "/blasts/:id",
        zValidator("param", params),
        zValidator("json", body),
        async (c) => {
            const {id} = c.req.valid("param")
            const content = c.req.valid("json")
            const {link} = content
            const text = await _resolveText(content.text, link)
            const blast = await sql(c)`
                UPDATE blasts
                SET text = ${text}, link = ${link}, updated_at = ${new Date()}
                WHERE id = ${id}
                RETURNING id, text, link, published_at, updated_at
            `.first<Blast>()
            if (!blast) {
                throw new HTTPException(404, {message: "Blast not found"})
            }
            return c.json(blast)
        },
    )
    .delete("/blasts/:id", zValidator("param", params), async (c) => {
        const {id} = c.req.valid("param")
        const {meta} = await sql(c)`
            DELETE FROM blasts WHERE id = ${id}
        `.run()
        if (meta.changes === 0) {
            throw new HTTPException(404, {message: "Blast not found"})
        }
        return c.body(null, 204)
    })
