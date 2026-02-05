# Quick Start Guide

Get your Base Wallet Tracker bot running in 5 minutes!

## Step 1: Install Dependencies

```bash
cd telegram-base-tracker
npm install
```

## Step 2: Get a Telegram Bot Token

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Choose a name for your bot (e.g., "My Wallet Tracker")
4. Choose a username (must end in "bot", e.g., "my_wallet_tracker_bot")
5. Copy the token that BotFather gives you

## Step 3: Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your bot token:

```
TELEGRAM_BOT_TOKEN=your_token_here_from_botfather
BASE_RPC_URL=https://mainnet.base.org
POLL_INTERVAL=30
```

## Step 4: (Optional) Get BaseScan API Key

For enhanced features like transaction history:

1. Go to https://basescan.org/
2. Sign up for a free account
3. Go to "API Keys" section
4. Create a new API key
5. Add it to your `.env` file:

```
BASESCAN_API_KEY=your_api_key_here
```

## Step 5: Start the Bot

```bash
npm start
```

You should see:
```
🚀 Starting Base Wallet Tracker Bot...
✅ Bot is running! Use /start in Telegram to interact with it.
Starting wallet monitoring (checking every 30s)
```

## Step 6: Use Your Bot

1. Open Telegram
2. Search for your bot username (the one you chose in Step 2)
3. Send `/start`
4. Add a wallet to track:
   ```
   /add 0xYourWalletAddressHere
   ```

## What You'll See

When the wallet you're tracking makes a transaction, you'll get a notification like:

```
📉 Wallet Activity Detected!

Address: 0x48d6...e709
New Balance: 0.023138 ETH
Change: -0.003126 ETH
New Transactions: 2

━━━━━━━━━━━━━━━━━━

🔄 Token Swap on Uniswap V3 Router

Sold: 0.003126 ETH
📍 0xEeee...eeEE

Bought: 1234.567890 PEPE
📍 0x6982...1933

Tx: 0x1234...5678
[View on BaseScan]
```

## Useful Commands

- `/list` - See all wallets you're tracking
- `/analyze <address>` - Analyze latest transaction for any wallet
- `/balance <address>` - Check balance of any wallet
- `/help` - See all commands

## Troubleshooting

### Bot not responding?
- Make sure the bot is running (`npm start`)
- Check that your token is correct in `.env`
- Look for errors in the console

### Not getting notifications?
- Make sure you've added a wallet with `/add`
- Check that `POLL_INTERVAL` in `.env` isn't too high
- Verify the wallet address is correct

### Transaction analysis not working?
- Add a BaseScan API key to `.env` (see Step 4)
- Make sure the wallet has recent transactions

## Next Steps

- Track multiple wallets by running `/add` multiple times
- Use `/analyze` to understand what any wallet is doing
- Check the main README.md for advanced configuration options

Happy tracking! 🚀
