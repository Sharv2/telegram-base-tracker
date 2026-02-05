import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import blockchainService from './blockchain.js';
import walletTracker from './tracker.js';

class TelegramBotService {
  constructor() {
    this.bot = new TelegramBot(config.telegramToken, { polling: true });
    this.setupCommands();
    this.setupCallbacks();
  }

  setupCommands() {
    // /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const welcomeMessage = `
🤖 *Welcome to Base Wallet Tracker Bot!*

This bot helps you track wallet activities on the Base blockchain.

*Available Commands:*
/add <address> - Add a wallet to track
/remove <address> - Remove a wallet from tracking
/list - Show all tracked wallets
/balance <address> - Get current balance
/tx <hash> - Get transaction details
/recent <address> - Get recent transactions
/analyze <address> - Analyze latest transaction (tokens, swaps, etc.)
/help - Show this help message

*Example:*
\`/add 0x742d35Cc6634C0532925a3b844Bc454e4438f44e\`
      `;
      this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // /help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId, this.getHelpMessage(), { parse_mode: 'Markdown' });
    });

    // /setchannel command - help with setting up channel broadcasting
    this.bot.onText(/\/setchannel/, (msg) => {
      const chatId = msg.chat.id;
      const helpMessage = `
📢 *Channel Broadcasting Setup*

To broadcast buy/sell signals to a Telegram channel:

*Step 1: Get Your Channel ID*
1. Add @username_to_id_bot to your channel as admin
2. Forward any message from your channel to @username_to_id_bot
3. The bot will reply with your channel ID (e.g., -1001234567890)

*Step 2: Add Bot to Channel*
1. Add this bot (@OptimusMaximus) to your channel as admin
2. Give it permission to post messages

*Step 3: Configure*
1. Open your .env file
2. Add this line:
   \`CHANNEL_ID=-1001234567890\`
   (replace with your actual channel ID)
3. Restart the bot

*Current Status:*
${config.channelId ? `✅ Channel configured: \`${config.channelId}\`` : '❌ No channel configured'}

Once configured, all buy/sell signals will be posted to both your private chat and the channel!
      `;
      this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // /add command
    this.bot.onText(/\/add (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const address = match[1].trim();

      try {
        const normalizedAddress = walletTracker.addWallet(chatId, address);

        const balance = await blockchainService.getBalance(normalizedAddress);
        const txCount = await blockchainService.getTransactionCount(normalizedAddress);

        this.bot.sendMessage(chatId,
          `✅ *Wallet added successfully!*\n\n` +
          `Address: \`${normalizedAddress}\`\n` +
          `Balance: ${balance} ETH\n` +
          `Transactions: ${txCount}\n\n` +
          `You'll receive notifications when this wallet has activity.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
      }
    });

    // /remove command
    this.bot.onText(/\/remove (.+)/, (msg, match) => {
      const chatId = msg.chat.id;
      const address = match[1].trim();

      const removed = walletTracker.removeWallet(chatId, address);

      if (removed) {
        this.bot.sendMessage(chatId,
          `✅ Wallet removed from tracking:\n\`${address}\``,
          { parse_mode: 'Markdown' }
        );
      } else {
        this.bot.sendMessage(chatId, '❌ Wallet not found in your tracking list.');
      }
    });

    // /list command
    this.bot.onText(/\/list/, async (msg) => {
      const chatId = msg.chat.id;
      const wallets = walletTracker.getWallets(chatId);

      if (wallets.length === 0) {
        this.bot.sendMessage(chatId,
          '📭 You are not tracking any wallets yet.\n\nUse /add <address> to start tracking.'
        );
        return;
      }

      let message = `📊 *Your Tracked Wallets (${wallets.length})*\n\n`;

      for (const address of wallets) {
        try {
          const balance = await blockchainService.getBalance(address);
          const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
          message += `• \`${shortAddress}\` - ${parseFloat(balance).toFixed(4)} ETH\n`;
        } catch (error) {
          message += `• \`${address}\` - Error fetching balance\n`;
        }
      }

      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // /balance command
    this.bot.onText(/\/balance (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const address = match[1].trim();

      try {
        if (!blockchainService.isValidAddress(address)) {
          throw new Error('Invalid Ethereum address');
        }

        const balance = await blockchainService.getBalance(address);
        const txCount = await blockchainService.getTransactionCount(address);

        this.bot.sendMessage(chatId,
          `💰 *Wallet Balance*\n\n` +
          `Address: \`${address}\`\n` +
          `Balance: *${balance} ETH*\n` +
          `Total Transactions: ${txCount}`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
      }
    });

    // /tx command
    this.bot.onText(/\/tx (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const txHash = match[1].trim();

      try {
        const tx = await blockchainService.getTransaction(txHash);

        if (!tx) {
          this.bot.sendMessage(chatId, '❌ Transaction not found.');
          return;
        }

        this.bot.sendMessage(chatId,
          `🔍 *Transaction Details*\n\n` +
          `Hash: \`${tx.hash}\`\n` +
          `From: \`${tx.from}\`\n` +
          `To: \`${tx.to || 'Contract Creation'}\`\n` +
          `Value: *${tx.value} ETH*\n` +
          `Gas Price: ${tx.gasPrice} Gwei\n` +
          `Block: ${tx.blockNumber}\n` +
          `Status: ${tx.status}`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
      }
    });

    // /recent command
    this.bot.onText(/\/recent (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const address = match[1].trim();

      try {
        if (!blockchainService.isValidAddress(address)) {
          throw new Error('Invalid Ethereum address');
        }

        const transactions = await blockchainService.getRecentTransactions(address, 5);

        if (transactions.length === 0) {
          this.bot.sendMessage(chatId,
            '📭 No recent transactions found or BaseScan API key not configured.'
          );
          return;
        }

        let message = `📜 *Recent Transactions for*\n\`${address}\`\n\n`;

        transactions.forEach((tx, index) => {
          const shortHash = `${tx.hash.slice(0, 10)}...`;
          const direction = tx.from.toLowerCase() === address.toLowerCase() ? '📤 OUT' : '📥 IN';

          message += `${index + 1}. ${direction} ${tx.value} ETH\n`;
          message += `   Hash: \`${shortHash}\`\n`;
          message += `   Time: ${tx.timeStamp}\n\n`;
        });

        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
      }
    });

    // /analyze command - analyze latest transaction for a wallet
    this.bot.onText(/\/analyze (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const address = match[1].trim();

      try {
        if (!blockchainService.isValidAddress(address)) {
          throw new Error('Invalid Ethereum address');
        }

        this.bot.sendMessage(chatId, '🔍 Analyzing latest transaction...');

        // Get latest transactions (check up to 5 to find a swap)
        const txHashes = await blockchainService.getLatestTransactionHashes(address, 5);

        if (txHashes.length === 0) {
          this.bot.sendMessage(chatId, '❌ No transactions found for this wallet.');
          return;
        }

        // Analyze transactions until we find a BUY/SELL/SWAP
        let analysis = null;
        for (const txHash of txHashes) {
          const result = await blockchainService.analyzeTransaction(txHash, address);
          if (result && (result.type === 'BUY' || result.type === 'SELL' || result.type === 'SWAP')) {
            analysis = result;
            break;
          }
        }

        if (!analysis) {
          this.bot.sendMessage(chatId, '❌ No BUY/SELL/SWAP transactions found in recent history.');
          return;
        }

        // Format and send the analysis
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
        const summary = blockchainService.formatTransactionSummary(analysis, shortAddress);

        if (summary) {
          this.bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });
        } else {
          this.bot.sendMessage(chatId, '❌ Unable to format transaction.');
        }

      } catch (error) {
        this.bot.sendMessage(chatId, `❌ Error: ${error.message}`);
      }
    });
  }

  setupCallbacks() {
    // Handle errors
    this.bot.on('polling_error', (error) => {
      console.error('Polling error:', error);
    });
  }

  getHelpMessage() {
    return `
🤖 *Base Wallet Tracker Bot - Help*

*Commands:*

*/add* <address>
Add a wallet to your tracking list. You'll receive notifications when the wallet has activity.

*/remove* <address>
Remove a wallet from your tracking list.

*/list*
Show all wallets you're currently tracking with their balances.

*/balance* <address>
Get the current ETH balance of any wallet.

*/tx* <hash>
Get detailed information about a specific transaction.

*/recent* <address>
Show the 5 most recent transactions for a wallet.

*/analyze* <address>
Analyze the latest transaction for a wallet. Shows token swaps, buys/sells with contract addresses and ticker symbols.

*/setchannel*
Get instructions for setting up channel broadcasting.

*/help*
Show this help message.

*Examples:*
\`/add 0x742d35Cc6634C0532925a3b844Bc454e4438f44e\`
\`/balance 0x742d35Cc6634C0532925a3b844Bc454e4438f44e\`
\`/analyze 0x742d35Cc6634C0532925a3b844Bc454e4438f44e\`

*Note:* All addresses should be valid Base blockchain addresses.
    `;
  }

  /**
   * Send notification about wallet changes (BUY/SELL only)
   */
  async sendWalletNotification(chatId, change) {
    const { address, transaction } = change;

    if (!transaction) {
      console.log('⚠️  No transaction data in notification');
      return;
    }

    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

    // Format the notification based on transaction type
    const summary = blockchainService.formatTransactionSummary(transaction, shortAddress);

    if (!summary) {
      console.log('⚠️  No summary generated for notification');
      return;
    }

    try {
      // Send to the user who's tracking this wallet
      await this.bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });
      console.log(`✅ Notification sent to chat ${chatId}`);

      // Also broadcast to channel if configured
      if (config.channelId) {
        try {
          await this.bot.sendMessage(config.channelId, summary, { parse_mode: 'Markdown' });
          console.log(`📢 Notification broadcast to channel ${config.channelId}`);
        } catch (channelError) {
          console.error(`❌ Error broadcasting to channel ${config.channelId}:`, channelError.message);
          console.error('   Make sure the bot is added as admin to the channel with posting permissions');
        }
      }
    } catch (error) {
      console.error(`Error sending notification to chat ${chatId}:`, error);
    }
  }

  /**
   * Start the monitoring service
   */
  startMonitoring() {
    walletTracker.startMonitoring((chatId, change) => {
      this.sendWalletNotification(chatId, change);
    });
  }

  /**
   * Stop the bot
   */
  stop() {
    walletTracker.stopMonitoring();
    this.bot.stopPolling();
  }
}

export default TelegramBotService;
