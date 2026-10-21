import type {Syndication} from "#services/syndication"
import type {Context} from "#utils/hono"

function _isConfigured(c: Context) {
    return Boolean(c.env.MASTODON_INSTANCE && c.env.MASTODON_ACCESS_TOKEN)
}

function _format(text: string, externalLink: string | null) {
    let content = text.trim()
    let suffix = ""
    let suffixLength = 0
    if (externalLink) {
        suffix = `\n${externalLink}`
        suffixLength = suffix.length
        if (/^https?:\/\//iu.test(externalLink)) {
            suffixLength = 24
        } else {
            suffix = suffix.slice(0, 500).replace(/[\uD800-\uDBFF]$/u, "")
        }
    }
    content = content
        .slice(0, Math.max(0, 500 - suffixLength))
        .replace(/[\uD800-\uDBFF]$/u, "")
    return `${content}${suffix}`
}

async function _send(c: Context, content: string, id: string) {
    const instance = c.env.MASTODON_INSTANCE
    const accessToken = c.env.MASTODON_ACCESS_TOKEN
    if (!instance || !accessToken) return
    const url = new URL("/api/v1/statuses", instance)
    if (url.protocol !== "https:") {
        throw new Error("Mastodon instance must use HTTPS")
    }
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Idempotency-Key": `blast:${id}`,
        },
        body: new URLSearchParams({status: content, visibility: "public"}),
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
    })
    await response.body?.cancel()
    if (!response.ok) {
        console.error("Mastodon delivery failed", response.status)
    }
}

export default {
    isConfigured: _isConfigured,
    format: _format,
    send: _send,
} satisfies Syndication
