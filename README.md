# Base Wallet Tracker Telegram Bot

A Telegram bot that tracks wallet activities on the Base blockchain and sends real-time notifications.

## Features

- **Track Multiple Wallets**: Monitor unlimited Base blockchain wallets simultaneously
- **Persistent Storage**: Tracked wallets survive bot restarts - no need to re-add them
- **Real-time Notifications**: Get instant alerts when wallet activity is detected
- **Smart Transaction Analysis**: Automatically detects and decodes:
  - Token swaps on DEXs (Uniswap, BaseSwap, Aerodrome, etc.)
  - Token purchases and sales
  - Token transfers
  - ETH transfers
- **Token Information**: Shows token symbols, contract addresses, and amounts
- **DEX Detection**: Identifies which DEX was used for swaps
- **Detailed Transaction Info**: View comprehensive transaction details
- **Transaction History**: Browse recent transactions with timestamps
- **Direct Links**: Get BaseScan links for all transactions
- **Easy-to-use Interface**: Simple Telegram commands

## Prerequisites

- Node.js (v18 or higher)
- A Telegram Bot Token (get from [@BotFather](https://t.me/botfather))
- Optional: BaseScan API key for enhanced transaction history

## Installation

1. Clone or navigate to this directory

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Edit `.env` and add your credentials:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
BASE_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=your_basescan_api_key_here
POLL_INTERVAL=30
```

## Getting Your Credentials

### Telegram Bot Token
1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the token provided

### BaseScan API Key (Optional)
1. Visit [BaseScan](https://basescan.org/)
2. Create an account
3. Go to API Keys section
4. Generate a new API key

## Usage

### Start the bot:
```bash
npm start
```

### Development mode (with auto-reload):
```bash
npm run dev
```

## Telegram Commands

Once the bot is running, open it in Telegram and use these commands:

- `/start` - Welcome message and instructions
- `/help` - Show all available commands
- `/add <address>` - Start tracking a wallet
- `/remove <address>` - Stop tracking a wallet
- `/list` - Show all your tracked wallets with current balances
- `/balance <address>` - Get current balance of any wallet
- `/tx <hash>` - Get transaction details
- `/recent <address>` - Show recent transactions
- `/analyze <address>` - **Analyze latest transaction** (shows token swaps, buys/sells, contract addresses, ticker symbols)

### Example Usage:

```
/add 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
/balance 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
/analyze 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
/list
```

## How It Works

1. **Add wallets** to track using `/add` command
2. The bot **periodically checks** these wallets (default: every 30 seconds)
3. When a change is detected, the bot **automatically analyzes** the transaction to determine:
   - What tokens were bought or sold
   - Token contract addresses and symbols
   - Which DEX was used (Uniswap, BaseSwap, Aerodrome, etc.)
   - Transaction amounts and values
4. You receive a **detailed notification** with all the decoded information
5. **BaseScan links** are provided for every transaction
6. You can check status anytime using various commands

## Example Notification

When a tracked wallet makes a transaction, you'll receive a detailed notification like this:

```
📉 Wallet Activity Detected!

Address: 0x48d6...e709
New Balance: 0.023138 ETH
Change: -0.003126 ETH
New Transactions: 2

━━━━━━━━━━━━━━━━━━

🔄 Token Swap on Uniswap V3 Router

Sold: 0.003126 ETH
📍 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE

Bought: 1234.567890 PEPE
📍 0x6982508145454Ce325dDbE47a25d4ec3d2311933

Tx: 0x1234abcd...5678efgh
[View on BaseScan](https://basescan.org/tx/0x...)
```

The bot automatically detects:
- Token swaps (showing both tokens and amounts)
- Token purchases (with ETH spent)
- Token sales (with ETH received)
- Simple token transfers
- Which DEX was used

## Data Persistence

Your tracked wallets are automatically saved and will persist across bot restarts!

- **Auto-save**: Wallets are saved whenever you add/remove them
- **Periodic saves**: Data is saved every 5 minutes while running
- **Restart safe**: When you restart the bot, all your tracked wallets are automatically restored
- **Storage location**: Data is stored in `data/tracked-wallets.json`

You don't need to do anything - just add wallets once and they'll be remembered!

## Configuration

Edit `.env` file to customize:

- `POLL_INTERVAL` - How often to check wallets (in seconds, default: 30)
- `BASE_RPC_URL` - Base blockchain RPC endpoint
- `BASESCAN_API_KEY` - For enhanced transaction history features

## Project Structure

```
telegram-base-tracker/
├── src/
│   ├── index.js          # Main entry point
│   ├── bot.js            # Telegram bot logic & commands
│   ├── blockchain.js     # Base blockchain interaction
│   ├── tracker.js        # Wallet tracking & monitoring
│   ├── tokenUtils.js     # Token & DEX swap analysis
│   ├── storage.js        # Persistent data storage
│   └── config.js         # Configuration management
├── data/                 # Stored wallet data (auto-created)
│   └── tracked-wallets.json
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Troubleshooting

### Bot not responding
- Check if your Telegram Bot Token is correct
- Ensure the bot is running (`npm start`)
- Check console for error messages

### Wallet tracking not working
- Verify the Base RPC URL is accessible
- Check if wallet addresses are valid
- Ensure POLL_INTERVAL is not too high

### Transaction history not showing
- Add a BaseScan API key to `.env`
- Verify the API key is valid

## Security Notes

- Never commit your `.env` file
- Keep your Telegram Bot Token private
- Use environment variables for sensitive data

## License

MIT
