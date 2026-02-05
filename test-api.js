import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.BASESCAN_API_KEY;
const TEST_ADDRESS = '0x48d6526066d7de8e506ce1575bfe6a171ab76e709'; // The address from your screenshot

console.log('Testing BaseScan API...\n');
console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 8)}...` : 'MISSING');
console.log('Test Address:', TEST_ADDRESS);
console.log('\nMaking API call...\n');

// BaseScan uses Etherscan API V2 - chainid 8453 is Base network
const url = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${TEST_ADDRESS}&startblock=0&endblock=99999999&page=1&offset=5&sort=desc&apikey=${API_KEY}`;

try {
  const response = await fetch(url);
  const text = await response.text();

  console.log('=== RAW RESPONSE ===');
  console.log('HTTP Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
  console.log('First 200 chars:', text.substring(0, 200));

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.log('\n❌ Response is not valid JSON!');
    console.log('Full response:', text);
    process.exit(1);
  }

  console.log('\n=== PARSED API RESPONSE ===');
  console.log('Status:', data.status);
  console.log('Message:', data.message);
  console.log('Result Type:', data.result ? typeof data.result : 'null');
  console.log('Result Length:', Array.isArray(data.result) ? data.result.length : 'N/A');

  if (data.result && Array.isArray(data.result) && data.result.length > 0) {
    console.log('\n✅ SUCCESS! Found', data.result.length, 'transactions');
    console.log('\nFirst transaction:');
    console.log('  Hash:', data.result[0].hash);
    console.log('  Block:', data.result[0].blockNumber);
    console.log('  From:', data.result[0].from);
    console.log('  To:', data.result[0].to);
  } else {
    console.log('\n❌ NO TRANSACTIONS FOUND');
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
  }
} catch (error) {
  console.error('❌ ERROR:', error);
}
