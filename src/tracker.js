import blockchainService from './blockchain.js';
import { config } from './config.js';
import storage from './storage.js';

class WalletTracker {
  constructor() {
    this.watchedWallets = new Map(); // chatId -> [addresses]
    this.lastChecked = new Map(); // address -> { balance, txCount }
    this.saveInterval = null;

    // Load saved data
    this.loadData();
  }

  /**
   * Load tracked wallets from storage
   */
  loadData() {
    const { watchedWallets, lastChecked } = storage.loadWallets();
    this.watchedWallets = watchedWallets;
    this.lastChecked = lastChecked;
  }

  /**
   * Save tracked wallets to storage
   */
  saveData() {
    storage.saveWallets(this.watchedWallets, this.lastChecked);
  }

  /**
   * Add a wallet to track for a specific chat
   */
  addWallet(chatId, address) {
    if (!blockchainService.isValidAddress(address)) {
      throw new Error('Invalid Ethereum address');
    }

    const normalizedAddress = address.toLowerCase();

    if (!this.watchedWallets.has(chatId)) {
      this.watchedWallets.set(chatId, new Set());
    }

    this.watchedWallets.get(chatId).add(normalizedAddress);

    // Save to disk
    this.saveData();

    return normalizedAddress;
  }

  /**
   * Remove a wallet from tracking for a specific chat
   */
  removeWallet(chatId, address) {
    const normalizedAddress = address.toLowerCase();

    if (this.watchedWallets.has(chatId)) {
      this.watchedWallets.get(chatId).delete(normalizedAddress);

      if (this.watchedWallets.get(chatId).size === 0) {
        this.watchedWallets.delete(chatId);
      }

      // Save to disk
      this.saveData();

      return true;
    }

    return false;
  }

  /**
   * Get all wallets tracked by a specific chat
   */
  getWallets(chatId) {
    return Array.from(this.watchedWallets.get(chatId) || []);
  }

  /**
   * Get all chats tracking a specific wallet
   */
  getChatsForWallet(address) {
    const normalizedAddress = address.toLowerCase();
    const chats = [];

    for (const [chatId, addresses] of this.watchedWallets.entries()) {
      if (addresses.has(normalizedAddress)) {
        chats.push(chatId);
      }
    }

    return chats;
  }

  /**
   * Check for changes in tracked wallets
   */
  async checkWalletChanges(onChangeCallback) {
    const allAddresses = new Set();
    let hasChanges = false;

    // Collect all unique addresses being tracked
    for (const addresses of this.watchedWallets.values()) {
      for (const address of addresses) {
        allAddresses.add(address);
      }
    }

    // Check each address for changes
    for (const address of allAddresses) {
      try {
        const balance = await blockchainService.getBalance(address);
        const txCount = await blockchainService.getTransactionCount(address);

        const lastData = this.lastChecked.get(address);

        if (lastData) {
          const balanceChanged = lastData.balance !== balance;
          const txCountChanged = lastData.txCount !== txCount;

          if (balanceChanged || txCountChanged) {
            const txCountChange = txCount - lastData.txCount;

            // Get latest transactions and analyze them
            try {
              const txHashes = await blockchainService.getLatestTransactionHashes(address, txCountChange || 1);
              console.log(`📝 Analyzing ${txHashes.length} new transaction(s) for ${address.slice(0, 10)}...`);

              for (const txHash of txHashes) {
                const analysis = await blockchainService.analyzeTransaction(txHash, address);

                // ONLY notify for BUY, SELL, or SWAP transactions
                if (analysis && (analysis.type === 'BUY' || analysis.type === 'SELL' || analysis.type === 'SWAP')) {
                  console.log(`✅ Notifying for ${analysis.type} transaction`);

                  // Notify all chats tracking this wallet
                  const chats = this.getChatsForWallet(address);
                  for (const chatId of chats) {
                    await onChangeCallback(chatId, { address, transaction: analysis });
                  }
                } else {
                  console.log(`⏭️  Skipping notification for transaction type: ${analysis?.type || 'none'}`);
                }
              }
            } catch (error) {
              console.error(`Error analyzing transactions for ${address}:`, error);
            }

            hasChanges = true;
          }
        } else {
          // First time checking this address - just store the initial state
          console.log(`📊 First check for ${address.slice(0, 10)}... - storing initial state`);
        }

        // Update stored data
        this.lastChecked.set(address, { balance, txCount });

      } catch (error) {
        console.error(`Error checking wallet ${address}:`, error);
      }
    }

    // Save if there were any changes
    if (hasChanges) {
      this.saveData();
    }
  }

  /**
   * Start monitoring all tracked wallets
   */
  startMonitoring(onChangeCallback) {
    console.log(`Starting wallet monitoring (checking every ${config.pollInterval}s)`);

    // Initial check
    this.checkWalletChanges(onChangeCallback);

    // Set up periodic checks
    this.monitoringInterval = setInterval(() => {
      this.checkWalletChanges(onChangeCallback);
    }, config.pollInterval * 1000);

    // Set up periodic saving (every 5 minutes)
    this.saveInterval = setInterval(() => {
      this.saveData();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Stopped wallet monitoring');
    }

    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }

    // Final save before stopping
    this.saveData();
    console.log('Saved tracked wallets to disk');
  }

  /**
   * Get summary of all tracked wallets
   */
  getSummary() {
    const totalChats = this.watchedWallets.size;
    const totalWallets = new Set();

    for (const addresses of this.watchedWallets.values()) {
      for (const address of addresses) {
        totalWallets.add(address);
      }
    }

    return {
      totalChats,
      totalWallets: totalWallets.size,
    };
  }
}

export default new WalletTracker();
