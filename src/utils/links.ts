import {decodeHTML} from "entities"

async function _readTitle(response: Response) {
    let title = ""
    let complete = false
    const rewritten = new HTMLRewriter()
        .on("head > title", {
            element(element) {
                element.onEndTag(() => {
                    complete = true
                })
            },
            text(chunk) {
                title += chunk.text
            },
        })
        .transform(response)
    const reader = rewritten.body?.getReader()
    if (!reader) {
        return ""
    }
    let bytes = 0
    try {
        while (!complete && bytes < 64 * 1024) {
            const {done, value} = await reader.read()
            if (done) break
            bytes += value.byteLength
        }
    } finally {
        await reader.cancel().catch(() => {})
        reader.releaseLock()
    }
    if (!complete) {
        return ""
    }
    return decodeHTML(title).replace(/\s+/gu, " ").trim()
}

export async function fetchTitle(link: string) {
    if (!/^https?:\/\//iu.test(link)) {
        return ""
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    try {
        const response = await fetch(link, {
            headers: {
                Accept: "text/html, application/xhtml+xml",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            },
            signal: controller.signal,
        })
        const contentType = response.headers.get("Content-Type") ?? ""
        if (!response.ok || !contentType.toLowerCase().includes("html")) {
            await response.body?.cancel()
            return ""
        }
        return await _readTitle(response)
    } catch {
        return ""
    } finally {
        clearTimeout(timeout)
        controller.abort()
    }
}
