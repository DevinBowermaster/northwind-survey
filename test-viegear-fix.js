require('dotenv').config();
const { getClientContract, getContractServiceUnits } = require('./autotask-contracts');

async function testViegearFix() {
  console.log('=== TESTING VIEGEAR FIX ===\n');
  
  const companyId = 2194; // VIEGEAR
  
  // Get contract - should now be category 12, not 16
  const contract = await getClientContract(companyId);
  
  console.log('Contract Retrieved:');
  console.log(`  Contract ID: ${contract.id}`);
  console.log(`  Contract Category: ${contract.contractCategory} (should be 12, not 16)`);
  console.log(`  Contract Name: ${contract.contractName}`);
  console.log(`  Contract Type: ${contract.displayType}`);
  console.log();
  
  if (contract.contractCategory === 16) {
    console.log('❌ STILL GETTING SaaS CONTRACT (category 16) - FIX DID NOT WORK');
    return;
  }
  
  if (contract.contractCategory === 12) {
    console.log('✓ Correctly selected category 12 (Managed Service Unlimited)');
  }
  
  // Get revenue
  const unitsResult = await getContractServiceUnits(contract.id, new Date());
  
  console.log('\nRevenue Calculation:');
  console.log(`  Total Monthly Revenue: $${unitsResult.totalMonthlyRevenue}`);
  console.log(`  Expected: $400.00`);
  console.log(`  Match: ${Math.abs(unitsResult.totalMonthlyRevenue - 400) < 5 ? '✓ YES' : '✗ NO'}`);
}

testViegearFix().catch(console.error);
