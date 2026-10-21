import type {Syndication} from "#services/syndication"
import type {Context} from "#utils/hono"

function _isConfigured(c: Context) {
    return Boolean(c.env.DISCORD_WEBHOOK_URL)
}

function _format(text: string, externalLink: string | null) {
    let content = text.trim()
    let suffix = ""
    if (externalLink) {
        const link = externalLink.replace(/[\\()]/gu, "\\$&")
        suffix = `](${link})`
        let label = ""
        for (const character of content) {
            const escaped = character.replace(/[\\[\]]/gu, "\\$&")
            if (1 + label.length + escaped.length + suffix.length > 2000) break
            label += escaped
        }
        content = `[${label}`
    }
    content = content
        .slice(0, Math.max(0, 2000 - suffix.length))
        .replace(/[\uD800-\uDBFF]$/u, "")
    return `${content}${suffix}`.slice(0, 2000).replace(/[\uD800-\uDBFF]$/u, "")
}

async function _send(c: Context, content: string) {
    const webhookUrl = c.env.DISCORD_WEBHOOK_URL
    if (!webhookUrl) return
    const url = new URL(webhookUrl)
    url.searchParams.set("wait", "true")
    const payload = {
        content,
        allowed_mentions: {parse: []},
    }
    const response = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload),
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
    })
    await response.body?.cancel()
    if (!response.ok) {
        console.error("Discord webhook delivery failed", response.status)
    }
}

export default {
    isConfigured: _isConfigured,
    format: _format,
    send: _send,
} satisfies Syndication
