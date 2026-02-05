import dotenv from 'dotenv';
dotenv.config();

const TEST_ADDRESS = '0x48d6526066d7de8e506ce1575bfe6a171ab76e709';

console.log('Testing WITHOUT API key...\n');
console.log('Test Address:', TEST_ADDRESS);
console.log('\nMaking API call...\n');

// Test without API key
const url = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${TEST_ADDRESS}&startblock=0&endblock=99999999&page=1&offset=5&sort=desc`;

try {
  const response = await fetch(url);
  const data = await response.json();

  console.log('=== API RESPONSE (NO KEY) ===');
  console.log('Status:', data.status);
  console.log('Message:', data.message);
  console.log('Result Length:', Array.isArray(data.result) ? data.result.length : 'N/A');

  if (data.result && Array.isArray(data.result) && data.result.length > 0) {
    console.log('\n✅ SUCCESS! Found', data.result.length, 'transactions');
  } else {
    console.log('\n❌ NO TRANSACTIONS FOUND');
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
} catch (error) {
  console.error('❌ ERROR:', error);
}
