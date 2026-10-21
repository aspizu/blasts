import {format, formatDistanceToNow, isBefore, subHours} from "date-fns"
import {jsxRenderer} from "hono/jsx-renderer"

import hono from "#utils/hono"
import type {Blast} from "#utils/models"
import sql from "#utils/sql"

function _renderBlast(blast: Blast) {
    const publishedAt = new Date(blast.published_at)
    const title = blast.text.trim() || "Blast"
    let className = "h-entry"
    if (isBefore(publishedAt, subHours(new Date(), 12))) {
        className += " stale"
    }
    let content = <p class="p-name e-content">{title}</p>
    if (blast.link) {
        content = (
            <p class="p-name e-content">
                <a href={blast.link}>{title}</a>
            </p>
        )
    }
    return (
        <article class={className} id={`blast-${blast.id}`}>
            <data class="u-url u-uid" value={`#blast-${blast.id}`} />
            {content}
            <time
                class="dt-published"
                datetime={blast.published_at}
                title={format(publishedAt, "PPp O")}
            >
                {formatDistanceToNow(publishedAt, {addSuffix: true})}
            </time>
            <time class="dt-updated" datetime={blast.updated_at} hidden />
        </article>
    )
}

export default hono().get("/", jsxRenderer(), async (c) => {
    const {results} = await sql(c)`
        SELECT id, text, link, published_at, updated_at FROM blasts
        ORDER BY id DESC
        LIMIT 1000
    `.all<Blast>()
    return c.render(
        <html class="h-feed" lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title class="p-name">{c.env.FEED_TITLE}</title>
                <link
                    class="u-url"
                    rel="canonical"
                    href={new URL("/", c.req.url).href}
                />
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <link rel="stylesheet" href="/style.css" />
                <link
                    rel="alternate"
                    type="application/rss+xml"
                    title={c.env.FEED_TITLE}
                    href="/rss.xml"
                />
            </head>
            <body>
                <header>
                    <strong>blasts</strong>
                    <nav>
                        <a href="https://github.com/aspizu/blasts">GitHub</a>
                        <a href="/rss.xml">Subscribe</a>
                    </nav>
                </header>
                <main aria-label="Latest blasts">
                    {results.map((blast, index) => (
                        <>
                            {index > 0 && <hr />}
                            {_renderBlast(blast)}
                        </>
                    ))}
                </main>
            </body>
        </html>,
    )
})
