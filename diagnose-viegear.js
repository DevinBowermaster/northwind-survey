require('dotenv').config();
const { getClientContract, getContractServiceUnits } = require('./autotask-contracts');

async function diagnoseViegear() {
  console.log('=== DIAGNOSING VIEGEAR ===\n');
  
  const companyId = 2194; // VIEGEAR
  const today = new Date();
  
  // Get contract details
  const contract = await getClientContract(companyId);
  
  console.log('Contract Details:');
  console.log(`  Contract ID: ${contract.id}`);
  console.log(`  Contract Name: ${contract.contractName}`);
  console.log(`  Contract Type: ${contract.contractType} (${contract.displayType})`);
  console.log(`  Contract Category: ${contract.contractCategory}`);
  console.log(`  Contract Period Type: ${contract.contractPeriodType}`);
  console.log(`  Start Date: ${contract.startDate}`);
  console.log(`  End Date: ${contract.endDate}`);
  console.log(`  Estimated Revenue: $${contract.estimatedRevenue}`);
  console.log();
  
  // Get service units
  const unitsResult = await getContractServiceUnits(contract.id, today);
  
  console.log(`Found ${unitsResult.services.length} services in current period (${today.toISOString().split('T')[0]}):\n`);
  
  unitsResult.services.forEach((service, idx) => {
    console.log(`Service ${idx + 1}:`);
    console.log(`  Service ID: ${service.serviceID}`);
    console.log(`  Units: ${service.units}`);
    console.log(`  Price: $${service.price}`);
    console.log(`  Start: ${service.startDate}`);
    console.log(`  End: ${service.endDate}`);
    console.log();
  });
  
  console.log(`Total from ContractServiceUnits: $${unitsResult.totalMonthlyRevenue}`);
  console.log(`Expected Monthly Amount: $400.00`);
  console.log(`Match: ${unitsResult.totalMonthlyRevenue === 400 ? '✓ YES' : '✗ NO'}`);
  console.log();
  
  // Calculate what the monthly SHOULD be based on contract period
  const start = new Date(contract.startDate);
  const end = new Date(contract.endDate);
  const months = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.44));
  const estimatedMonthly = contract.estimatedRevenue / months;
  
  console.log('=== Analysis ===');
  console.log(`Contract Period: ${months} months`);
  console.log(`Estimated Revenue ÷ Months: $${contract.estimatedRevenue} ÷ ${months} = $${estimatedMonthly.toFixed(2)}`);
  console.log();
  
  // Check for pattern
  console.log('=== Pattern Check ===');
  console.log(`ContractPeriodType: ${contract.contractPeriodType}`);
  console.log('  2 = Monthly (most working contracts have this)');
  console.log('  5 = ??? (VIEGEAR, MANZO, MAVIK have this)');
  console.log();
  console.log('Hypothesis: contractPeriodType 5 might be Annual/Quarterly');
  console.log('If so, we need different logic for these contracts');
}

diagnoseViegear().catch(console.error);
