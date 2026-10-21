import {z} from "zod"

import type {Syndication} from "#services/syndication"
import type {Context} from "#utils/hono"

const encoder = new TextEncoder()
const segmenter = new Intl.Segmenter(undefined, {granularity: "grapheme"})
const quotes = new Map([
    ["'", "'"],
    ["‘", "’"],
])
const brackets = new Map([
    [")", "("],
    ["]", "["],
    ["}", "{"],
])

const session = z.object({
    accessJwt: z.string().min(1),
    did: z.string().min(1),
    didDoc: z
        .object({
            service: z
                .object({
                    id: z.string(),
                    type: z.string(),
                    serviceEndpoint: z.union([
                        z.string(),
                        z.record(z.string(), z.unknown()),
                    ]),
                })
                .array()
                .optional(),
        })
        .optional(),
})

function _isConfigured(c: Context) {
    return Boolean(c.env.BLUESKY_IDENTIFIER && c.env.BLUESKY_APP_PASSWORD)
}

function _format(text: string) {
    return text.trim() || "Blast"
}

function _shortenText(text: string) {
    let end = 0
    let graphemes = 0
    let bytes = 0
    for (const {segment, index} of segmenter.segment(text)) {
        graphemes += 1
        bytes += encoder.encode(segment).byteLength
        if (graphemes > 300 || bytes > 3000) {
            return `${text.slice(0, end).trimEnd()}…`
        }
        if (graphemes < 300 && bytes <= 2997) {
            end = index + segment.length
        }
    }
    return text
}

function _trimLink(uri: string, preceding: string | undefined) {
    const quote = quotes.get(preceding ?? "")
    if (quote) {
        const end = uri.lastIndexOf(quote)
        if (end >= 0) {
            uri = uri.slice(0, end)
        }
    }
    uri = uri.replace(/[.,!?;:]+$/u, "")
    while (uri) {
        const closing = uri.slice(-1)
        const opening = brackets.get(closing)
        if (!opening || uri.split(closing).length <= uri.split(opening).length) break
        uri = uri.slice(0, -1).replace(/[.,!?;:]+$/u, "")
    }
    return uri
}

function _linkFacets(text: string, postText: string) {
    const facets = []
    let end = postText.length
    if (text !== postText) {
        end -= 1
    }
    for (const match of text.matchAll(/https?:\/\/[^\s<>"`“”]+/gu)) {
        const preceding = text.slice(0, match.index).match(/['‘][([{]*$/u)?.[0]?.[0]
        const uri = _trimLink(match[0], preceding)
        if (!URL.parse(uri)?.hostname || match.index + uri.length > end) continue
        const byteStart = encoder.encode(text.slice(0, match.index)).byteLength
        facets.push({
            index: {byteStart, byteEnd: byteStart + encoder.encode(uri).byteLength},
            features: [{$type: "app.bsky.richtext.facet#link", uri}],
        })
    }
    return facets
}

async function _request(
    service: string,
    method: string,
    body: unknown,
    accessJwt?: string,
) {
    const headers = new Headers({"Content-Type": "application/json"})
    if (accessJwt) {
        headers.set("Authorization", `Bearer ${accessJwt}`)
    }
    const response = await fetch(new URL(`/xrpc/${method}`, service), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
        await response.body?.cancel()
        throw new Error(`Bluesky ${method} failed (${response.status})`)
    }
    return response
}

async function _createSession(service: string, identifier: string, password: string) {
    const response = await _request(service, "com.atproto.server.createSession", {
        identifier,
        password,
    })
    const {accessJwt, did, didDoc} = session.parse(await response.json())
    const pds = didDoc?.service?.find(
        (entry) =>
            entry.id.endsWith("#atproto_pds") &&
            entry.type === "AtprotoPersonalDataServer",
    )?.serviceEndpoint
    if (typeof pds === "string" && pds) {
        service = pds
    }
    return {accessJwt, did, service}
}

async function _send(
    c: Context,
    content: string,
    id: string,
    externalLink: string | null,
    publishedAt: string,
) {
    const identifier = c.env.BLUESKY_IDENTIFIER
    const password = c.env.BLUESKY_APP_PASSWORD
    if (!identifier || !password) return
    const {accessJwt, did, service} = await _createSession(
        c.env.BLUESKY_SERVICE_URL || "https://bsky.social",
        identifier,
        password,
    )
    const postText = _shortenText(content)
    let link = externalLink
    if (postText !== content) {
        link = new URL(`/#blast-${id}`, c.req.url).href
    }
    let embed
    if (link) {
        embed = {
            $type: "app.bsky.embed.external",
            external: {uri: link, title: postText, description: ""},
        }
    }
    const posted = await _request(
        service,
        "com.atproto.repo.createRecord",
        {
            repo: did,
            collection: "app.bsky.feed.post",
            record: {
                $type: "app.bsky.feed.post",
                text: postText,
                facets: _linkFacets(content, postText),
                embed,
                createdAt: publishedAt,
            },
        },
        accessJwt,
    )
    await posted.body?.cancel()
}

export default {
    isConfigured: _isConfigured,
    format: _format,
    send: _send,
} satisfies Syndication
