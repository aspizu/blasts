import {decodeHTML} from "entities"

export async function fetchTitle(link: string) {
    if (!/^https?:\/\//iu.test(link)) {
        return ""
    }
    try {
        const response = await fetch(link, {
            headers: {
                Accept: "text/html, application/xhtml+xml",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(10_000),
        })
        const contentType = response.headers.get("Content-Type") ?? ""
        if (!response.ok || !contentType.toLowerCase().includes("html")) {
            await response.body?.cancel()
            return ""
        }
        let title = ""
        const rewritten = new HTMLRewriter()
            .on("head > title", {
                text(chunk) {
                    title += chunk.text
                },
            })
            .transform(response)
        await rewritten.body?.pipeTo(new WritableStream())
        return decodeHTML(title).replace(/\s+/gu, " ").trim()
    } catch {
        return ""
    }
}
