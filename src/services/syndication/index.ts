import bluesky from "#services/syndication/bluesky"
import discord from "#services/syndication/discord"
import mastodon from "#services/syndication/mastodon"
import type {Context} from "#utils/hono"

export interface Syndication {
    isConfigured(c: Context): boolean
    format(text: string, externalLink: string | null): string
    send(
        c: Context,
        content: string,
        id: string,
        externalLink: string | null,
        publishedAt: string,
    ): Promise<void>
}

const _syndications: readonly Syndication[] = [discord, mastodon, bluesky]

export function publish(
    c: Context,
    id: string,
    text: string,
    externalLink: string | null,
    publishedAt: string,
) {
    for (const syndication of _syndications) {
        if (!syndication.isConfigured(c)) continue
        const content = syndication.format(text, externalLink)
        c.executionCtx.waitUntil(
            syndication.send(c, content, id, externalLink, publishedAt).catch(() => {
                console.error("Syndication delivery failed")
            }),
        )
    }
}
