import TelegramBotService from './bot.js';

console.log('🚀 Starting Base Wallet Tracker Bot...');

const bot = new TelegramBotService();

// Start monitoring wallets
bot.startMonitoring();

console.log('✅ Bot is running! Use /start in Telegram to interact with it.');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down bot...');
  bot.stop();
  process.exit(0);
});
