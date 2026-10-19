import {generateRssFeed} from "feedsmith"

import {formatTitle} from "#api/blasts"
import hono from "#utils/hono"
import type {Blast} from "#utils/models"
import sql from "#utils/sql"

export default hono().get("/rss.xml", async (c) => {
    const {results} = await sql(c)`
        SELECT * FROM blasts
        ORDER BY id DESC
        LIMIT 1000
    `.all<Blast>()
    const {origin} = new URL(c.req.url)
    const feed = generateRssFeed({
        title: c.env.FEED_TITLE,
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
        items: results.map((blast) => ({
            title: formatTitle(blast),
            link: blast.link ?? `${origin}/blasts/${blast.id}`,
            guid: {value: blast.id, isPermaLink: false},
            pubDate: new Date(blast.published_at),
        })),
    })
    c.header("Content-Type", "application/rss+xml; charset=utf-8")
    return c.body(feed)
})
