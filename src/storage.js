import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const WALLETS_FILE = path.join(DATA_DIR, 'tracked-wallets.json');

class Storage {
  constructor() {
    this.ensureDataDirectory();
  }

  /**
   * Ensure the data directory exists
   */
  ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log('Created data directory');
    }
  }

  /**
   * Save tracked wallets to file
   * @param {Map} watchedWallets - Map of chatId -> Set of addresses
   * @param {Map} lastChecked - Map of address -> {balance, txCount}
   */
  saveWallets(watchedWallets, lastChecked) {
    try {
      const data = {
        watchedWallets: {},
        lastChecked: {},
        savedAt: new Date().toISOString(),
      };

      // Convert Map of Sets to plain object
      for (const [chatId, addresses] of watchedWallets.entries()) {
        data.watchedWallets[chatId] = Array.from(addresses);
      }

      // Convert Map to plain object
      for (const [address, info] of lastChecked.entries()) {
        data.lastChecked[address] = info;
      }

      fs.writeFileSync(WALLETS_FILE, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Saved ${Object.keys(data.watchedWallets).length} chats with tracked wallets`);
    } catch (error) {
      console.error('Error saving wallets:', error);
    }
  }

  /**
   * Load tracked wallets from file
   * @returns {{watchedWallets: Map, lastChecked: Map}}
   */
  loadWallets() {
    try {
      if (!fs.existsSync(WALLETS_FILE)) {
        console.log('No saved wallets found, starting fresh');
        return {
          watchedWallets: new Map(),
          lastChecked: new Map(),
        };
      }

      const data = JSON.parse(fs.readFileSync(WALLETS_FILE, 'utf8'));

      const watchedWallets = new Map();
      const lastChecked = new Map();

      // Convert plain object back to Map of Sets
      // IMPORTANT: Convert chatId back to number (Telegram sends numeric chatIds)
      for (const [chatId, addresses] of Object.entries(data.watchedWallets)) {
        watchedWallets.set(Number(chatId), new Set(addresses));
      }

      // Convert plain object back to Map
      for (const [address, info] of Object.entries(data.lastChecked)) {
        lastChecked.set(address, info);
      }

      const totalWallets = new Set();
      for (const addresses of watchedWallets.values()) {
        for (const addr of addresses) {
          totalWallets.add(addr);
        }
      }

      console.log(`Loaded ${watchedWallets.size} chats tracking ${totalWallets.size} unique wallets`);
      console.log(`Last saved: ${data.savedAt}`);

      return { watchedWallets, lastChecked };
    } catch (error) {
      console.error('Error loading wallets:', error);
      return {
        watchedWallets: new Map(),
        lastChecked: new Map(),
      };
    }
  }

  /**
   * Clear all saved data
   */
  clearWallets() {
    try {
      if (fs.existsSync(WALLETS_FILE)) {
        fs.unlinkSync(WALLETS_FILE);
        console.log('Cleared all saved wallet data');
      }
    } catch (error) {
      console.error('Error clearing wallets:', error);
    }
  }
}

export default new Storage();
