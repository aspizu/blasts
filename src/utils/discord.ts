import type {Context} from "#utils/hono"

export async function sendDiscordWebhook(
    c: Context,
    id: string,
    text: string,
    externalLink: string | null,
) {
    const webhookUrl = c.env.DISCORD_WEBHOOK_URL
    if (!webhookUrl) return
    const url = new URL(webhookUrl)
    url.searchParams.set("wait", "true")
    const link = new URL(`/blasts/${id}`, c.req.url).href
    let content = text.trim() || link
    if (externalLink) {
        content = `🔗 ${externalLink}\n${content}`
    }
    const payload = {
        content: content.slice(0, 2000).replace(/[\uD800-\uDBFF]$/u, ""),
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
