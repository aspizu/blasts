import {zValidator} from "@hono/zod-validator"
import {HTTPException} from "hono/http-exception"
import * as uuid from "uuid"
import {z} from "zod"

import hono from "#utils/hono"
import sql from "#utils/sql"

const body = z.strictObject({
    text: z.string().min(1),
})

const params = z.object({id: z.uuidv7()})

export default hono()
    .get("/blasts/", async (c) => {
        const {results} = await sql(c)`
            SELECT * FROM blasts
            ORDER BY id DESC
            LIMIT 1000
        `.all<{
            id: string
            text: string
            published_at: string
            updated_at: string
        }>()
        return c.json({blasts: results})
    })
    .post("/blasts/", zValidator("json", body), async (c) => {
        const {text} = c.req.valid("json")
        const now = Date.now()
        const id = uuid.v7({msecs: now})
        const timestamp = new Date(now).toISOString()
        const blast = {
            id,
            text,
            published_at: timestamp,
            updated_at: timestamp,
        }
        await sql(c)`
            INSERT INTO blasts (id, text, published_at, updated_at)
            VALUES (${id}, ${text}, ${timestamp}, ${timestamp})
        `.run()
        c.header("Location", `/blasts/${id}/`)
        return c.json(blast, 201)
    })
    .get("/blasts/:id", zValidator("param", params), async (c) => {
        const {id} = c.req.valid("param")
        const blast = await sql(c)`
            SELECT * FROM blasts WHERE id = ${id}
        `.first<{
            id: string
            text: string
            published_at: string
            updated_at: string
        }>()
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
            const {text} = c.req.valid("json")
            const blast = await sql(c)`
                UPDATE blasts SET text = ${text}, updated_at = ${new Date()}
                WHERE id = ${id}
                RETURNING *
            `.first<{
                id: string
                text: string
                published_at: string
                updated_at: string
            }>()
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
