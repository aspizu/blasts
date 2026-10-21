# blasts

blasts lets you micro-blog on RSS.

Similar in spirit to [dcim](https://github.com/aspizu/dcim), it runs on
Cloudflare Workers.

Fork the repo and follow the [install guide](docs/install.md) to host your own feed.

Post with curl or a Telegram bot. Optional syndication can send new blasts to a
Discord channel or a Mastodon account.

The API accepts `text` and an optional `link` in JSON. The link becomes the RSS
entry's link, and the text becomes its title. When a link is given, `text` can be
omitted or set to `null` to fetch the page title. If no title is found, blasts uses
the link without its scheme.

In Telegram, start a message with a URL and put its title on the following lines.
If no text follows, blasts tries to fetch the page title.
