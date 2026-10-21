# Set-up your own blasts

You'll need GitHub and Cloudflare accounts, Node.js 26, and pnpm 12.

## Fork the repo

Fork [aspizu/blasts](https://github.com/aspizu/blasts) on GitHub, then clone your
fork. Replace `YOUR_USERNAME` with your GitHub username:

```sh
git clone https://github.com/YOUR_USERNAME/blasts.git
cd blasts
pnpm ci
```

## Deploy

Sign in to Cloudflare and create the database:

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create blasts
```

In `wrangler.jsonc`, replace `blasts.aspiz.uk` with a hostname in your Cloudflare account.

Set a username and password for posting, and a title for your feed.

```sh
pnpm exec wrangler secret put AUTH_USERNAME
pnpm exec wrangler secret put AUTH_PASSWORD
pnpm exec wrangler secret put FEED_TITLE
```

If Wrangler asks to create the Worker, accept. Deploy with:

```sh
pnpm run deploy
```

## Send a blast

Use the username and password you set above:

```sh
curl --user 'YOUR_USERNAME:YOUR_PASSWORD' \
    --header 'Content-Type: application/json' \
    --data '{"text":"My first blast."}' \
    https://blasts.example.com/blasts/
```

To share a link, send it as a separate JSON field:

```sh
curl --user 'YOUR_USERNAME:YOUR_PASSWORD' \
    --header 'Content-Type: application/json' \
    --data '{"text":"An interesting page","link":"https://example.com/"}' \
    https://blasts.example.com/blasts/
```

Omit `text` or set it to `null` to use the page title, for example:

```json
{"text": null, "link": "https://example.com/"}
```

Blank text also uses the page title. If no title is found, blasts uses the link
without its scheme. Without a link, nonblank text is required.

The API stores supplied text as sent and does not extract links from it. Updates
with `PUT /blasts/:id` use the same JSON fields. Omit `link` or set it to `null` to
clear it.

## Telegram (optional)

Create a bot with
[BotFather](https://core.telegram.org/bots/tutorial#obtain-your-bot-token) and copy
its token:

```sh
TELEGRAM_BOT_TOKEN='YOUR_BOT_TOKEN'
```

Send the bot a message, then get the chat ID with
[`getUpdates`](https://core.telegram.org/bots/api#getupdates):

```sh
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates"
```

Copy `message.chat.id` from the response and save it, including any leading minus sign:

```sh
pnpm exec wrangler secret put TELEGRAM_CHAT_ID
```

Register the [webhook](https://core.telegram.org/bots/api#setwebhook). Use your
address and the same username and password you set earlier:

```sh
curl --request POST \
    --data-urlencode 'url=https://YOUR_USERNAME:YOUR_PASSWORD@blasts.example.com/webhooks/telegram' \
    --data-urlencode 'allowed_updates=["message","channel_post"]' \
    --data 'drop_pending_updates=true' \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook"
```

Use letters, numbers, `-`, or `_` in the username and password so they can be used
in the URL.

Send another message to publish a blast.

## Discord (optional)

Create a webhook for your Discord channel, then save its URL:

```sh
pnpm exec wrangler secret put DISCORD_WEBHOOK_URL
```

New blasts will also be sent to that channel.

## Mastodon (optional)

Create an application in your Mastodon account's development settings. Give it
the `write:statuses` permission and copy its user access token. See the
[Mastodon API guide](https://docs.joinmastodon.org/client/authorized/) for more
about user access tokens.

Save your server's full HTTPS URL, such as `https://mastodon.social`, then the
access token:

```sh
pnpm exec wrangler secret put MASTODON_INSTANCE
pnpm exec wrangler secret put MASTODON_ACCESS_TOKEN
```

Each command prompts for its value and saves it as a Worker secret.

New blasts will also be posted publicly to that account as plain text, with the
link on the last line. Text is cut to fit the 500-character limit, counting an
HTTP(S) link as 23 characters. Both settings must be present to enable posting.

## Deploy from GitHub

In your fork, enable [GitHub Actions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
and add the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
