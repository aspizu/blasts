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

## Deploy from GitHub

In your fork, enable [GitHub Actions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
and add the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
