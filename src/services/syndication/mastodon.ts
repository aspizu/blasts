import type {Syndication} from "#services/syndication"
import type {Context} from "#utils/hono"

const _segmenter = new Intl.Segmenter(undefined, {granularity: "grapheme"})

function _isConfigured(c: Context) {
    return Boolean(c.env.MASTODON_INSTANCE && c.env.MASTODON_ACCESS_TOKEN)
}

function _trimUrlPunctuation(part: string) {
    let depth = 0
    const matchedParentheses = new Set<number>()
    for (let position = 0; position < part.length; position += 1) {
        if (part[position] === "(") {
            depth += 1
        } else if (part[position] === ")" && depth > 0) {
            depth -= 1
            matchedParentheses.add(position)
        }
    }
    let end = part.length
    while (
        end > 0 &&
        /[.,!?;:'")\]}]/u.test(part.charAt(end - 1)) &&
        !matchedParentheses.has(end - 1)
    ) {
        end -= 1
    }
    return part.slice(0, end)
}

function _truncate(text: string, limit: number) {
    let result = ""
    let length = 0
    const parts = text.split(/(https?:\/\/[^\s<>]+)/giu)
    for (const [index, part] of parts.entries()) {
        let remaining = part
        if (index % 2 === 1) {
            const url = _trimUrlPunctuation(part)
            if (length + 23 > limit) break
            result += url
            length += 23
            remaining = part.slice(url.length)
        }
        for (const {segment} of _segmenter.segment(remaining)) {
            if (length + 1 > limit) {
                return result
            }
            result += segment
            length += 1
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
        if (/^https?:\/\//iu.test(externalLink)) {
            suffixLength = 24
        } else {
            const segments = Array.from(_segmenter.segment(suffix)).slice(0, 500)
            suffix = segments.map(({segment}) => segment).join("")
            suffixLength = segments.length
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
