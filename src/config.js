import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  baseRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  basescanApiKey: process.env.BASESCAN_API_KEY || '',
  pollInterval: parseInt(process.env.POLL_INTERVAL) || 30,
  channelId: process.env.CHANNEL_ID || '',
};

// Debug logging
console.log('Config loaded:');
console.log('- Telegram token:', config.telegramToken ? '✓ Set' : '✗ Missing');
console.log('- Base RPC URL:', config.baseRpcUrl);
console.log('- BaseScan API key:', config.basescanApiKey ? `✓ Set (${config.basescanApiKey.substring(0, 8)}...)` : '✗ Missing');
console.log('- Poll interval:', config.pollInterval);
console.log('- Channel ID:', config.channelId ? `✓ Set (${config.channelId})` : '✗ Not configured (broadcasting disabled)');

// Validate required config
if (!config.telegramToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is required in .env file');
}
