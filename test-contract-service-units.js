require('dotenv').config();
const { getContractServiceUnits } = require('./autotask-contracts');

async function testMSBTLaw() {
  console.log('=== Testing ContractServiceUnits for MSBT LAW ===\n');
  
  const contractId = 29683641;
  const today = new Date();
  
  console.log(`Contract ID: ${contractId}`);
  console.log(`As of Date: ${today.toISOString()}\n`);
  
  try {
    const result = await getContractServiceUnits(contractId, today);
    
    console.log(`Found ${result.services.length} services in current period:\n`);
    
    result.services.forEach((service, idx) => {
      console.log(`Service ${idx + 1}:`);
      console.log(`  Service ID: ${service.serviceID}`);
      console.log(`  Units: ${service.units}`);
      console.log(`  Price: $${service.price}`);
      console.log(`  Period: ${service.startDate} to ${service.endDate}`);
      console.log();
    });
    
    console.log(`Total Monthly Revenue: $${result.totalMonthlyRevenue}`);
    console.log(`Expected: $1778.00`);
    console.log(`Match: ${result.totalMonthlyRevenue === 1778 ? '✓ YES' : '✗ NO'}`);
    
  } catch (error) {
    console.error('ERROR:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testMSBTLaw();
