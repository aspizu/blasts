import hono from "#utils/hono"

export default hono()
    .get("/", (c) => c.json(null))
    .post("/", (c) => c.json(null))
