require('dotenv').config();
const axios = require('axios');

async function testFrontendAPI() {
  console.log('=== Testing Frontend API Endpoint ===\n');
  
  const apiUrl = 'http://localhost:3000/api/contract-usage/all';
  
  try {
    const response = await axios.get(apiUrl);
    const unlimitedContracts = response.data.filter(c => c.contractType === 'Unlimited');
    
    console.log(`Found ${unlimitedContracts.length} unlimited contracts:\n`);
    
    // Show first 5
    unlimitedContracts.slice(0, 10).forEach(contract => {
      console.log(`${contract.clientName}:`);
      console.log(`  Monthly Revenue: $${contract.monthlyRevenue || 'NULL'}`);
      console.log(`  Current Month Used: ${contract.currentMonth?.used || 0} hrs`);
      console.log();
    });
    
    // Check specific ones
    const msbt = unlimitedContracts.find(c => c.clientName.includes('MSBT'));
    const unitedWay = unlimitedContracts.find(c => c.clientName.includes('UNITED WAY'));
    
    console.log('\n=== Key Contracts ===');
    if (msbt) {
      console.log(`MSBT LAW: $${msbt.monthlyRevenue || 'NULL'} (expected: $1778)`);
    }
    if (unitedWay) {
      console.log(`United Way: $${unitedWay.monthlyRevenue || 'NULL'} (expected: $1493)`);
    }
    
  } catch (error) {
    console.error('ERROR calling API:', error.message);
  }
}

testFrontendAPI();
