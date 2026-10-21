import type {Syndication} from "#services/syndication"
import type {Context} from "#utils/hono"

function _isConfigured(c: Context) {
    return Boolean(c.env.MASTODON_INSTANCE && c.env.MASTODON_ACCESS_TOKEN)
}

function _truncate(text: string, limit: number) {
    let result = ""
    let length = 0
    const parts = text.split(/(https?:\/\/[^\s<>]+)/giu)
    for (const [index, part] of parts.entries()) {
        let remaining = part
        if (index % 2 === 1) {
            const url = part.replace(/[.,!?;:'")\]}]+$/gu, "")
            if (length + 23 > limit) break
            result += url
            length += 23
            remaining = part.slice(url.length)
        }
        for (const character of remaining) {
            if (length + character.length > limit) {
                return result
            }
            result += character
            length += character.length
        }
    }
    return result
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
    content = _truncate(content, Math.max(0, 500 - suffixLength))
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
