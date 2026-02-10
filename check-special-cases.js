require('dotenv').config();
const { getClientContract } = require('./autotask-contracts');

async function checkSpecialCases() {
  console.log('=== CHECKING COLLIERS AND WESTWATER ===\n');
  
  const clients = [
    { name: 'COLLIERS', companyId: 2160 },
    { name: 'WESTWATER RESEARCH', companyId: 2154 }
  ];
  
  for (const client of clients) {
    console.log(`--- ${client.name} ---`);
    
    const contract = await getClientContract(client.companyId);
    
    if (!contract) {
      console.log('  No contract found\n');
      continue;
    }
    
    console.log(`  Contract ID: ${contract.id}`);
    console.log(`  Contract Type: ${contract.contractType} (4=Block Hours, 7=Unlimited)`);
    console.log(`  Contract Category: ${contract.contractCategory} (12=Managed Service, 13=Block Hours)`);
    console.log(`  Display Type: ${contract.displayType}`);
    console.log(`  Monthly Allocation: ${contract.monthlyAllocation}`);
    
    if (contract.contractType === 4 && contract.contractCategory === 12) {
      console.log('  ⚠️  SPECIAL CASE: Category 12 (Unlimited) but Type 4 (Block Hours)');
      console.log('  Should display as: Unlimited');
      console.log('  Should show amount: Block Hours allocation amount');
    }
    console.log();
  }
}

checkSpecialCases().catch(console.error);
