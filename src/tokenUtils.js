import { ethers } from 'ethers';
import { config } from './config.js';

// ERC-20 ABI for token operations
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

// Uniswap V2 Router ABI (common across many DEXs)
const UNISWAP_V2_ROUTER_ABI = [
  'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)',
];

// Uniswap V3 Pool ABI
const UNISWAP_V3_POOL_ABI = [
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
];

// Known DEX routers on Base
const KNOWN_DEX_ROUTERS = {
  '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24': 'BaseSwap',
  '0x327df1e6de05895d2ab08513aadd9313fe505d86': 'Aerodrome',
  '0x2626664c2603336e57b271c5c0b26f421741e481': 'Uniswap V3 Router',
  '0xd0dbb1d0b0d4e0e482c1c1a6cf7e6a13b9a7e8c3': 'SushiSwap',
  '0x1b81d678ffb9c0263b24a97847620c99d213eb14': 'Balancer',
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap Universal Router',
};

class TokenUtils {
  constructor(provider) {
    this.provider = provider;
    this.tokenCache = new Map(); // Cache token info
  }

  /**
   * Get token information (symbol, name, decimals)
   */
  async getTokenInfo(tokenAddress) {
    // Check cache first
    if (this.tokenCache.has(tokenAddress.toLowerCase())) {
      return this.tokenCache.get(tokenAddress.toLowerCase());
    }

    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);

      const [symbol, name, decimals] = await Promise.all([
        tokenContract.symbol().catch(() => 'UNKNOWN'),
        tokenContract.name().catch(() => 'Unknown Token'),
        tokenContract.decimals().catch(() => 18),
      ]);

      const tokenInfo = {
        address: tokenAddress,
        symbol,
        name,
        decimals: Number(decimals),
      };

      // Cache the result
      this.tokenCache.set(tokenAddress.toLowerCase(), tokenInfo);

      return tokenInfo;
    } catch (error) {
      console.error(`Error getting token info for ${tokenAddress}:`, error);
      return {
        address: tokenAddress,
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 18,
      };
    }
  }

  /**
   * Parse ERC-20 Transfer events from transaction receipt
   */
  async parseTransferEvents(receipt) {
    const transfers = [];

    for (const log of receipt.logs) {
      try {
        // Transfer event signature
        const transferTopic = ethers.id('Transfer(address,address,uint256)');

        if (log.topics[0] === transferTopic) {
          const from = ethers.getAddress('0x' + log.topics[1].slice(26));
          const to = ethers.getAddress('0x' + log.topics[2].slice(26));
          const value = BigInt(log.data);

          const tokenInfo = await this.getTokenInfo(log.address);

          transfers.push({
            tokenAddress: log.address,
            tokenSymbol: tokenInfo.symbol,
            tokenName: tokenInfo.name,
            decimals: tokenInfo.decimals,
            from,
            to,
            value: value,
            valueFormatted: ethers.formatUnits(value, tokenInfo.decimals),
          });
        }
      } catch (error) {
        // Skip logs that can't be parsed
        continue;
      }
    }

    return transfers;
  }

  /**
   * Detect DEX swaps from transaction
   */
  async detectSwap(tx, receipt, walletAddress) {
    const walletLower = walletAddress.toLowerCase();

    // Get all token transfers
    const transfers = await this.parseTransferEvents(receipt);

    if (transfers.length < 2) {
      return null; // Not a swap
    }

    // Find tokens sent from wallet (token being sold)
    const tokensSent = transfers.filter(t => t.from.toLowerCase() === walletLower);

    // Find tokens received by wallet (token being bought)
    const tokensReceived = transfers.filter(t => t.to.toLowerCase() === walletLower);

    if (tokensSent.length === 0 && tokensReceived.length === 0) {
      return null; // Wallet not involved in transfers
    }

    // Determine DEX if possible
    let dexName = 'Unknown DEX';
    const toAddress = tx.to?.toLowerCase();
    if (toAddress && KNOWN_DEX_ROUTERS[toAddress]) {
      dexName = KNOWN_DEX_ROUTERS[toAddress];
    }

    // Analyze the swap
    if (tokensSent.length > 0 && tokensReceived.length > 0) {
      // Standard swap: sold one token, bought another
      return {
        type: 'SWAP',
        dex: dexName,
        tokenIn: tokensSent[0],
        tokenOut: tokensReceived[0],
        allTransfers: transfers,
      };
    } else if (tokensSent.length > 0) {
      // Only sent tokens (might be selling for ETH)
      const ethChange = tx.value ? ethers.formatEther(tx.value) : '0';

      return {
        type: 'SELL',
        dex: dexName,
        tokenSold: tokensSent[0],
        ethReceived: ethChange,
        allTransfers: transfers,
      };
    } else if (tokensReceived.length > 0) {
      // Only received tokens (might be buying with ETH)
      const ethChange = tx.value ? ethers.formatEther(tx.value) : '0';

      return {
        type: 'BUY',
        dex: dexName,
        tokenBought: tokensReceived[0],
        ethSpent: ethChange,
        allTransfers: transfers,
      };
    }

    return null;
  }

  /**
   * Analyze a transaction and determine what happened
   */
  async analyzeTransaction(txHash, walletAddress) {
    try {
      console.log(`🔬 TokenUtils: Analyzing transaction ${txHash.slice(0, 10)}...`);

      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash),
      ]);

      if (!tx || !receipt) {
        console.log('⚠️  Transaction or receipt not found');
        return null;
      }

      console.log(`📋 Transaction status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
      console.log(`📋 Transaction to: ${tx.to}`);

      const walletLower = walletAddress.toLowerCase();

      // Check if it's a DEX swap
      console.log('🔍 Checking for DEX swap...');
      const swapInfo = await this.detectSwap(tx, receipt, walletAddress);

      if (swapInfo) {
        console.log(`✅ DEX swap detected - Type: ${swapInfo.type}, DEX: ${swapInfo.dex}`);
        return {
          hash: txHash,
          type: swapInfo.type,
          ...swapInfo,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status === 1 ? 'Success' : 'Failed',
        };
      }

      // For all other transaction types, return null (won't be notified)
      console.log('⏭️  Non-swap transaction detected - returning null (will not notify)');
      return null;

    } catch (error) {
      console.error(`❌ Error analyzing transaction ${txHash}:`, error);
      return null;
    }
  }

  /**
   * Format transaction analysis for display
   */
  formatTransactionSummary(analysis, walletAddress = null) {
    if (!analysis) {
      return 'Unable to analyze transaction';
    }

    const basescanLink = `https://basescan.org/tx/${analysis.hash}`;
    let summary = '';
    const shortWallet = walletAddress || 'Wallet';

    switch (analysis.type) {
      case 'BUY':
        summary = `🟢 *BUY*\n\n`;
        summary += `Wallet: \`${shortWallet}\`\n`;

        // Calculate approximate USD value (using ETH spent)
        const ethSpent = analysis.ethSpent !== '0' ? parseFloat(analysis.ethSpent) : 0;
        // Rough estimate: 1 ETH = $3000 (you can make this dynamic later)
        const usdValue = ethSpent > 0 ? (ethSpent * 3000).toFixed(2) : 'N/A';

        summary += `Amount: $${usdValue} USD\n`;
        summary += `Token: ${analysis.tokenBought.tokenSymbol}\n`;
        summary += `Contract: \`${analysis.tokenBought.tokenAddress}\`\n\n`;
        summary += `[BaseScan](${basescanLink})`;
        break;

      case 'SELL':
        summary = `🔴 *SELL*\n\n`;
        summary += `Wallet: \`${shortWallet}\`\n`;

        // Calculate approximate USD value (using ETH received)
        const ethReceived = analysis.ethReceived !== '0' ? parseFloat(analysis.ethReceived) : 0;
        const usdValueSell = ethReceived > 0 ? (ethReceived * 3000).toFixed(2) : 'N/A';

        summary += `Amount: $${usdValueSell} USD\n`;
        summary += `Token: ${analysis.tokenSold.tokenSymbol}\n`;
        summary += `Contract: \`${analysis.tokenSold.tokenAddress}\`\n\n`;
        summary += `[BaseScan](${basescanLink})`;
        break;

      case 'SWAP':
        // Treat SWAP as either BUY or SELL depending on what was received
        summary = `🔄 *SWAP*\n\n`;
        summary += `Wallet: \`${shortWallet}\`\n`;
        summary += `${parseFloat(analysis.tokenIn.valueFormatted).toFixed(4)} ${analysis.tokenIn.tokenSymbol} → `;
        summary += `${parseFloat(analysis.tokenOut.valueFormatted).toFixed(4)} ${analysis.tokenOut.tokenSymbol}\n\n`;
        summary += `Contract: \`${analysis.tokenOut.tokenAddress}\`\n\n`;
        summary += `[BaseScan](${basescanLink})`;
        break;

      default:
        // For other types (TRANSFER, ETH_TRANSFER, UNKNOWN), return null
        // so they won't be notified
        return null;
    }

    return summary;
  }
}

export default TokenUtils;
