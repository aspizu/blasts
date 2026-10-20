import {basicAuth} from "hono/basic-auth"
import {HTTPException} from "hono/http-exception"

import blasts from "#api/blasts"
import index from "#api/index"
import rss from "#api/rss"
import webhooks from "#api/webhooks"
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
            key: c.req.header("cf-connecting-ip") ?? "unknown",
        })
        if (!success) {
            return c.text("Rate limit exceeded", 429, {"Retry-After": "60"})
        }
        return next()
    })
    .use("*", (c, next) => {
        if (c.req.method === "GET" || c.req.method === "HEAD") {
            return next()
        }
        return basicAuth({
            username: c.env.AUTH_USERNAME,
            password: c.env.AUTH_PASSWORD,
        })(c, next)
    })
    .route("/", index)
    .route("/", blasts)
    .route("/", rss)
    .route("/", webhooks)
