import { ethers } from 'ethers';
import { config } from './config.js';
import TokenUtils from './tokenUtils.js';

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.baseRpcUrl);
    this.tokenUtils = new TokenUtils(this.provider);
  }

  /**
   * Check if an address is valid
   */
  isValidAddress(address) {
    return ethers.isAddress(address);
  }

  /**
   * Get ETH balance for an address
   */
  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Get transaction count (nonce) for an address
   */
  async getTransactionCount(address) {
    try {
      return await this.provider.getTransactionCount(address);
    } catch (error) {
      console.error('Error getting transaction count:', error);
      throw error;
    }
  }

  /**
   * Get latest block number
   */
  async getBlockNumber() {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      console.error('Error getting block number:', error);
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return null;

      const receipt = await this.provider.getTransactionReceipt(txHash);

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : 'N/A',
        blockNumber: tx.blockNumber,
        status: receipt ? (receipt.status === 1 ? 'Success' : 'Failed') : 'Pending',
      };
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  /**
   * Listen for new transactions on a specific address
   */
  watchAddress(address, callback) {
    const filter = {
      address: null,
      topics: []
    };

    // Listen for incoming transactions
    this.provider.on(filter, async (log) => {
      try {
        const tx = await this.provider.getTransaction(log.transactionHash);
        if (tx && (tx.from === address || tx.to === address)) {
          callback(tx);
        }
      } catch (error) {
        console.error('Error in watch callback:', error);
      }
    });
  }

  /**
   * Get recent transactions for an address using BaseScan API
   */
  async getRecentTransactions(address, limit = 10) {
    if (!config.basescanApiKey) {
      console.warn('BaseScan API key not configured');
      return [];
    }

    try {
      // BaseScan uses Etherscan API V2 infrastructure - chainid 8453 is Base network
      const url = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${config.basescanApiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === '1' && data.result) {
        return data.result.map(tx => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: ethers.formatEther(tx.value),
          timeStamp: new Date(parseInt(tx.timeStamp) * 1000).toLocaleString(),
          blockNumber: tx.blockNumber,
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching transactions from BaseScan:', error);
      return [];
    }
  }

  /**
   * Get latest transaction hashes using Alchemy's efficient getAssetTransfers API
   * This uses FAR fewer compute units than scanning blocks manually
   */
  async getTransactionHashesFromAlchemy(address, limit = 5) {
    console.log('🔍 Using Alchemy getAssetTransfers API...');

    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = `0x${Math.max(0, currentBlock - 100).toString(16)}`; // Last ~200 seconds worth

      // Query transactions FROM this address
      const sentTxs = await this.provider.send('alchemy_getAssetTransfers', [{
        fromBlock: fromBlock,
        fromAddress: address,
        category: ['external', 'erc20', 'erc721', 'erc1155'],
        withMetadata: false,
        excludeZeroValue: false,
        maxCount: `0x${Math.min(limit * 2, 100).toString(16)}` // Get extra to ensure we have enough
      }]);

      // Query transactions TO this address
      const receivedTxs = await this.provider.send('alchemy_getAssetTransfers', [{
        fromBlock: fromBlock,
        toAddress: address,
        category: ['external', 'erc20', 'erc721', 'erc1155'],
        withMetadata: false,
        excludeZeroValue: false,
        maxCount: `0x${Math.min(limit * 2, 100).toString(16)}`
      }]);

      // Combine and deduplicate transaction hashes
      const allTransfers = [...(sentTxs.transfers || []), ...(receivedTxs.transfers || [])];
      const uniqueHashes = [...new Set(allTransfers.map(tx => tx.hash))];

      // Sort by block number (most recent first) and take the limit
      const sortedHashes = uniqueHashes
        .map(hash => {
          const transfer = allTransfers.find(t => t.hash === hash);
          return { hash, blockNum: parseInt(transfer.blockNum, 16) };
        })
        .sort((a, b) => b.blockNum - a.blockNum)
        .slice(0, limit)
        .map(item => item.hash);

      console.log(`✅ Alchemy API found ${sortedHashes.length} transaction(s)`);
      return sortedHashes;
    } catch (error) {
      console.error('❌ Error using Alchemy API:', error.message);
      // Fallback to BaseScan if Alchemy fails
      return [];
    }
  }

  /**
   * Get latest transaction hashes for an address
   */
  async getLatestTransactionHashes(address, limit = 5) {
    // Try BaseScan API first (faster if it works)
    if (config.basescanApiKey) {
      try {
        const url = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${config.basescanApiKey}`;

        console.log('🔍 Fetching transactions from BaseScan API V2...');

        const response = await fetch(url);
        const data = await response.json();

        console.log('📊 BaseScan API Response:');
        console.log(`   Status: ${data.status}`);
        console.log(`   Message: ${data.message}`);

        if (data.status === '1' && data.result && Array.isArray(data.result)) {
          const hashes = data.result.map(tx => tx.hash);
          console.log(`✅ API success! Found ${hashes.length} transaction(s)`);
          return hashes;
        }

        console.log('⚠️  API failed, using Alchemy fallback...');
      } catch (error) {
        console.log('⚠️  API error, using Alchemy fallback...');
      }
    }

    // Fallback: Use Alchemy's efficient getAssetTransfers API (uses minimal compute units)
    return await this.getTransactionHashesFromAlchemy(address, limit);
  }

  /**
   * Analyze a transaction to determine what happened
   */
  async analyzeTransaction(txHash, walletAddress) {
    console.log(`🔬 Analyzing transaction: ${txHash}`);
    try {
      const analysis = await this.tokenUtils.analyzeTransaction(txHash, walletAddress);
      if (analysis) {
        console.log(`✅ Transaction analyzed successfully - Type: ${analysis.type}`);
      } else {
        console.log('⚠️  Transaction analysis returned null');
      }
      return analysis;
    } catch (error) {
      console.error('❌ Error analyzing transaction:', error);
      return null;
    }
  }

  /**
   * Format transaction analysis for display
   */
  formatTransactionSummary(analysis, walletAddress = null) {
    return this.tokenUtils.formatTransactionSummary(analysis, walletAddress);
  }
}

export default new BlockchainService();
