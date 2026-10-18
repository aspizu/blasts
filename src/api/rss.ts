import {generateRssFeed} from "feedsmith"
import {html} from "hono/html"

import hono from "#utils/hono"
import sql from "#utils/sql"

export default hono().get("/rss.xml", async (c) => {
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
    const {origin} = new URL(c.req.url)
    const feed = generateRssFeed({
        title: "Blasts",
        description: "Latest blasts",
        link: `${origin}/blasts/`,
        atom: {
            links: [
                {
                    href: `${origin}/rss.xml`,
                    rel: "self",
                    type: "application/rss+xml",
                },
            ],
        },
        items: await Promise.all(
            results.map(async (blast) => {
                return {
                    title: blast.text.trim() || "Blast",
                    link: `${origin}/blasts/${blast.id}`,
                    description: (await html`${blast.text}`).toString(),
                    guid: {value: blast.id, isPermaLink: false},
                    pubDate: new Date(blast.published_at),
                }
            }),
        ),
    })
    c.header("Content-Type", "application/rss+xml; charset=utf-8")
    return c.body(feed)
})
