# blasts

blasts lets you micro-blog on RSS.

Similar in spirit to [dcim](https://github.com/aspizu/dcim), it runs on
Cloudflare Workers.

Fork the repo and follow the [install guide](docs/install.md) to host your own feed.

Post with curl or a Telegram bot. An optional Discord webhook can send new blasts
to a channel.

If a blast starts with a URL, that URL becomes the RSS entry's link. Text on the
following lines becomes its title. If no text follows, blasts tries to fetch the
page title.
