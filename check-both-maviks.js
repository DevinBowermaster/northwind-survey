require('dotenv').config();
const { getClientContract } = require('./autotask-contracts');

async function checkBothMaviks() {
  console.log('=== CHECKING BOTH MAVIK ENTRIES ===\n');
  
  const maviks = [
    { name: 'MAVIK 1 (Block Hours)', clientId: 22590, autotaskId: 2142 },
    { name: 'MAVIK 2 (Unlimited)', clientId: 22810, autotaskId: 2364 }
  ];
  
  for (const mavik of maviks) {
    console.log(`--- ${mavik.name} ---`);
    console.log(`Client ID: ${mavik.clientId}, Autotask ID: ${mavik.autotaskId}\n`);
    
    const contract = await getClientContract(mavik.autotaskId);
    
    if (!contract) {
      console.log('❌ No contract found\n');
      continue;
    }
    
    console.log('Contract Details:');
    console.log(`  Contract ID: ${contract.id}`);
    console.log(`  Contract Type: ${contract.contractType}`);
    console.log(`  Contract Category: ${contract.contractCategory}`);
    console.log(`  Display Type: ${contract.displayType}`);
    console.log(`  Monthly Allocation: ${contract.monthlyAllocation}`);
    
    // Check if this should be skipped
    const shouldSkip = (
      contract.displayType === 'Unlimited' &&
      contract.contractCategory === 16 &&
      contract.contractType === 7
    );
    
    console.log(`\nShould be skipped? ${shouldSkip ? '✓ YES' : '✗ NO'}`);
    
    if (shouldSkip) {
      console.log('This is a SaaS-only client and should NOT appear in Contract Health');
    }
    
    console.log();
  }
}

checkBothMaviks().catch(console.error);
