import {basicAuth} from "hono/basic-auth"
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
        if (c.req.method !== "GET" && c.req.method !== "HEAD") {
            return next()
        }
        const {success} = await c.env.READ_RATELIMIT.limit({
            key: c.req.header("cf-connecting-ip") ?? "unknown",
        })
        if (!success) {
            return c.text("Rate limit exceeded", 429, {"Retry-After": "60"})
        }
        return next()
    })
    .use("/blasts/*", (c, next) => {
        if (c.req.method === "GET" || c.req.method === "HEAD") {
            return next()
        }
        return basicAuth({
            username: c.env.AUTH_USERNAME,
            password: c.env.AUTH_PASSWORD,
            invalidUserMessage: async () => {
                const {success} = await c.env.AUTH_RATELIMIT.limit({
                    key: c.req.header("cf-connecting-ip") ?? "unknown",
                })
                if (!success) {
                    throw new HTTPException(429, {
                        res: c.text("Rate limit exceeded", 429, {"Retry-After": "60"}),
                    })
                }
                return "Unauthorized"
            },
        })(c, next)
    })
    .route("/", api)
