import {HTTPException} from "hono/http-exception"

import api from "#api/index"
import hono from "#utils/hono"

export default hono()
    .onError((err) => {
        if (err instanceof HTTPException) {
            return err.getResponse()
        }
        throw err
    })
    .use("*", async (c, next) => {
        const {success} = await c.env.RATELIMIT.limit({
            key: JSON.stringify({
                ip: c.req.header("cf-connecting-ip"),
                pathname: c.req.path,
            }),
        })
        if (!success) {
            throw new HTTPException(429, {message: "Rate limit exceeded"})
        }
        await next()
    })
    .route("/", api)
