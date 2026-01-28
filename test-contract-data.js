require('dotenv').config();
const db = require('./database');
const { getClientContract, getContractBlocks, getMonthlyTimeEntries } = require('./autotask-contracts');

/**
 * Test script for contract data functions
 * 
 * Tests the Autotask contract API functions with a real managed client
 * to verify API connectivity and see actual data structure.
 */

async function testDayWillisContractBlocks() {
  console.log('🔍 Testing Day Willis CPA Contract Blocks (Contract ID: 29683638)\n');
  console.log('=' .repeat(60));
  
  const { autotaskAPI } = require('./autotask');
  const contractId = 29683638;
  
  console.log(`\nTesting ContractBlocks queries for contract ID: ${contractId}\n`);
  
  // Test 1: Current approach (filter in search parameter)
  console.log('─'.repeat(60));
  console.log('\n📋 Test 1: Current Filter Approach\n');
  try {
    const params1 = {
      search: JSON.stringify({
        filter: [
          { op: 'eq', field: 'contractID', value: contractId }
        ],
        sort: [{ field: 'id', direction: 'DESC' }]
      })
    };
    console.log('Query:', JSON.stringify(params1, null, 2));
    const response1 = await autotaskAPI.get('/ContractBlocks/query', { params: params1 });
    console.log('Response Status:', response1.status);
    console.log('Response Headers:', JSON.stringify(response1.headers, null, 2));
    console.log('Response Data:', JSON.stringify(response1.data, null, 2));
    console.log(`Found ${response1.data.items?.length || 0} blocks\n`);
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Response:', error.response?.data || 'No response data');
    console.log('Status:', error.response?.status);
    console.log('Headers:', error.response?.headers || 'No headers');
    console.log('');
  }
  
  // Test 2: Query parameter approach
  console.log('─'.repeat(60));
  console.log('\n📋 Test 2: Query Parameter Approach\n');
  try {
    const params2 = {
      contractID: contractId
    };
    console.log('Query:', JSON.stringify(params2, null, 2));
    const response2 = await autotaskAPI.get('/ContractBlocks/query', { params: params2 });
    console.log('Response Status:', response2.status);
    console.log('Response Headers:', JSON.stringify(response2.headers, null, 2));
    console.log('Response Data:', JSON.stringify(response2.data, null, 2));
    console.log(`Found ${response2.data.items?.length || 0} blocks\n`);
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Response:', error.response?.data || 'No response data');
    console.log('Status:', error.response?.status);
    console.log('Headers:', error.response?.headers || 'No headers');
    console.log('');
  }
  
  // Test 3: Get all blocks and filter client-side
  console.log('─'.repeat(60));
  console.log('\n📋 Test 3: Get All Blocks (Client-Side Filter)\n');
  try {
    const params3 = {
      search: JSON.stringify({
        filter: [{ op: 'exist', field: 'id' }],
        MaxRecords: 1000
      })
    };
    console.log('Query: Getting all ContractBlocks (first 1000)...');
    const response3 = await autotaskAPI.get('/ContractBlocks/query', { params: params3 });
    console.log('Response Status:', response3.status);
    const allBlocks = response3.data.items || [];
    console.log(`Total blocks fetched: ${allBlocks.length}`);
    
    // Filter for our contract ID
    const filteredBlocks = allBlocks.filter(block => block.contractID === contractId);
    console.log(`Blocks for contract ${contractId}: ${filteredBlocks.length}`);
    
    if (filteredBlocks.length > 0) {
      console.log('\nFiltered Blocks:');
      filteredBlocks.forEach((block, index) => {
        console.log(`\nBlock ${index + 1}:`);
        console.log(JSON.stringify(block, null, 2));
      });
    } else {
      console.log('\n⚠️  No blocks found for this contract ID in the results');
    }
    console.log('');
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Response:', error.response?.data || 'No response data');
    console.log('Status:', error.response?.status);
    console.log('Headers:', error.response?.headers || 'No headers');
    console.log('');
  }
  
  // Test 4: Try with status filter
  console.log('─'.repeat(60));
  console.log('\n📋 Test 4: With Status Filter\n');
  try {
    const params4 = {
      search: JSON.stringify({
        filter: [
          { op: 'eq', field: 'contractID', value: contractId },
          { op: 'eq', field: 'isActive', value: true }
        ]
      })
    };
    console.log('Query:', JSON.stringify(params4, null, 2));
    const response4 = await autotaskAPI.get('/ContractBlocks/query', { params: params4 });
    console.log('Response Status:', response4.status);
    console.log('Response Data:', JSON.stringify(response4.data, null, 2));
    console.log(`Found ${response4.data.items?.length || 0} blocks\n`);
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Response:', error.response?.data || 'No response data');
    console.log('');
  }
  
  // Test 5: Try direct GET with contractID in path
  console.log('─'.repeat(60));
  console.log('\n📋 Test 5: Direct GET with contractID\n');
  try {
    console.log(`Trying: GET /ContractBlocks?contractID=${contractId}`);
    const response5 = await autotaskAPI.get(`/ContractBlocks?contractID=${contractId}`);
    console.log('Response Status:', response5.status);
    console.log('Response Data:', JSON.stringify(response5.data, null, 2));
    console.log(`Found ${response5.data.items?.length || 0} blocks\n`);
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Response:', error.response?.data || 'No response data');
    console.log('');
  }
  
  console.log('=' .repeat(60));
  console.log('\n✅ Day Willis CPA ContractBlocks test completed\n');
}

async function testContractData() {
  console.log('🧪 Testing Contract Data Functions\n');
  console.log('=' .repeat(60));
  
  // First, test Day Willis CPA specifically
  await testDayWillisContractBlocks();
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n🧪 Now testing general contract data functions...\n');
  console.log('=' .repeat(60));
  
  try {
    // Get ALL managed clients with Autotask IDs
    console.log('\n📋 Searching for Block Hours client...\n');
    const allClients = db.prepare(`
      SELECT id, autotask_id, name, company_type 
      FROM clients 
      WHERE company_type = 'managed' AND autotask_id IS NOT NULL
      ORDER BY name
    `).all();
    
    if (allClients.length === 0) {
      console.log('❌ No managed clients with Autotask ID found in database');
      console.log('   Please sync companies first using sync-autotask.js');
      return;
    }
    
    console.log(`📊 Found ${allClients.length} managed clients in database\n`);
    console.log('🔍 Checking contract status in Autotask API for all clients...\n');
    console.log('   This will help identify which client is missing.\n');
    
    // Data structures for summary
    const blockHoursClients = [];
    const unlimitedClients = [];
    const issuesClients = [];
    const noContractClients = [];
    const multipleContractsClients = [];
    const errorClients = [];
    let totalWithContracts = 0;
    
    // Process all clients
    for (let i = 0; i < allClients.length; i++) {
      const client = allClients[i];
      const progress = `[${i + 1}/${allClients.length}]`;
      process.stdout.write(`${progress} ${client.name}... `);
      
      try {
        // Get contract for this client - we need to check how many contracts exist
        const { autotaskAPI } = require('./autotask');
        const params = {
          search: JSON.stringify({
            filter: [
              { op: 'eq', field: 'companyID', value: client.autotask_id }
            ]
          })
        };
        
        const response = await autotaskAPI.get('/Contracts/query', { params });
        const allContracts = response.data.items || [];
        
        // Filter for active contracts
        const activeContracts = allContracts.filter(contract => {
          const status = contract.status;
          if (typeof status === 'number') {
            return status === 1;
          }
          if (typeof status === 'string') {
            const statusLower = status.toLowerCase();
            return statusLower !== 'complete' && statusLower !== 'canceled';
          }
          return status != null;
        });
        
        // Track contract status
        if (allContracts.length === 0) {
          noContractClients.push({
            name: client.name,
            autotaskId: client.autotask_id,
            totalContracts: 0,
            activeContracts: 0
          });
          console.log('❌ No contracts found');
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        
        if (activeContracts.length === 0) {
          noContractClients.push({
            name: client.name,
            autotaskId: client.autotask_id,
            totalContracts: allContracts.length,
            activeContracts: 0,
            note: 'Has contracts but none are active'
          });
          console.log(`⚠️  ${allContracts.length} contract(s) but none active`);
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        
        if (activeContracts.length > 1) {
          multipleContractsClients.push({
            name: client.name,
            autotaskId: client.autotask_id,
            totalContracts: allContracts.length,
            activeContracts: activeContracts.length,
            selectedContractId: activeContracts[0].id
          });
          console.log(`⚠️  ${activeContracts.length} active contracts (using first: ${activeContracts[0].id})`);
        }
        
        // Now get the contract using the normal function
        const contract = await getClientContract(client.autotask_id);
        
        if (!contract) {
          noContractClients.push({
            name: client.name,
            autotaskId: client.autotask_id,
            problem: 'getClientContract returned null'
          });
          console.log('❌ No contract returned');
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        
        totalWithContracts++;
        
        // Determine contract type and collect data
        if (contract.displayType === 'Block Hours') {
          const blocks = contract.blocks || await getContractBlocks(contract.id);
          const blockCount = blocks && Array.isArray(blocks) ? blocks.length : 0;
          const monthlyHours = contract.monthlyAllocation || 
                              (blocks && Array.isArray(blocks) && blocks.length > 0 
                                ? blocks[0].hours 
                                : null);
          
          // Check for issues
          let issue = null;
          if (contract.estimatedHours === 0 && (!blocks || blocks.length === 0)) {
            issue = 'estimatedHours=0 but no blocks found';
          } else if (!monthlyHours && blockCount === 0) {
            issue = 'No monthly hours and no blocks';
          }
          
          blockHoursClients.push({
            name: client.name,
            monthlyHours: monthlyHours || 'N/A',
            blockCount: blockCount,
            issue: issue
          });
          
          console.log(`✅ Block Hours (${monthlyHours || 'N/A'} hrs, ${blockCount} blocks)`);
          
        } else if (contract.displayType === 'Unlimited') {
          unlimitedClients.push({
            name: client.name
          });
          console.log(`♾️  Unlimited`);
          
        } else {
          issuesClients.push({
            name: client.name,
            problem: `Unknown contract type (Type: ${contract.contractType}, Category: ${contract.contractCategory})`
          });
          console.log(`⚠️  Unknown type`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errorClients.push({
          name: client.name,
          autotaskId: client.autotask_id,
          error: error.message,
          errorDetails: error.response?.data || 'No response data'
        });
        console.log(`❌ Error: ${error.message.substring(0, 50)}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Display summary table
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY TABLE - ALL MANAGED CLIENTS\n');
    console.log('='.repeat(80));
    
    // Block Hours Clients
    if (blockHoursClients.length > 0) {
      console.log(`\n✅ BLOCK HOURS CLIENTS (${blockHoursClients.length}):\n`);
      console.log('─'.repeat(80));
      console.log('Client Name'.padEnd(40) + ' | Monthly Hours'.padEnd(15) + ' | Blocks'.padEnd(10) + ' | Issues');
      console.log('─'.repeat(80));
      
      blockHoursClients.forEach(client => {
        const name = client.name.substring(0, 38).padEnd(40);
        const hours = String(client.monthlyHours).padEnd(15);
        const blocks = String(client.blockCount).padEnd(10);
        const issue = client.issue || '';
        console.log(`${name} | ${hours} | ${blocks} | ${issue}`);
      });
    }
    
    // Unlimited Clients
    if (unlimitedClients.length > 0) {
      console.log(`\n♾️  UNLIMITED CLIENTS (${unlimitedClients.length}):\n`);
      console.log('─'.repeat(80));
      console.log('Client Name');
      console.log('─'.repeat(80));
      
      unlimitedClients.forEach(client => {
        console.log(client.name);
      });
    }
    
    // Issues/Not Configured
    if (issuesClients.length > 0) {
      console.log(`\n⚠️  ISSUES / NOT CONFIGURED (${issuesClients.length}):\n`);
      console.log('─'.repeat(80));
      console.log('Client Name'.padEnd(40) + ' | Problem');
      console.log('─'.repeat(80));
      
      issuesClients.forEach(client => {
        const name = client.name.substring(0, 38).padEnd(40);
        console.log(`${name} | ${client.problem}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 CONTRACT STATUS SUMMARY\n');
    console.log('='.repeat(80));
    console.log(`\n📊 TOTALS:`);
    console.log(`   Total clients in database: ${allClients.length}`);
    console.log(`   Total clients with active contracts in Autotask: ${totalWithContracts}`);
    console.log(`   Missing/No Contract: ${noContractClients.length}`);
    console.log(`   Multiple Contracts: ${multipleContractsClients.length}`);
    console.log(`   Errors during lookup: ${errorClients.length}`);
    console.log(`\n   Breakdown by type:`);
    console.log(`   - Block Hours: ${blockHoursClients.length}`);
    console.log(`   - Unlimited: ${unlimitedClients.length}`);
    console.log(`   - Issues/Unknown: ${issuesClients.length}\n`);
    
    // Show missing contracts
    if (noContractClients.length > 0) {
      console.log('─'.repeat(80));
      console.log(`\n❌ MISSING / NO CONTRACT (${noContractClients.length}):\n`);
      noContractClients.forEach(client => {
        console.log(`   • ${client.name} (Autotask ID: ${client.autotaskId})`);
        if (client.totalContracts !== undefined) {
          console.log(`     - Total contracts: ${client.totalContracts}, Active: ${client.activeContracts}`);
        }
        if (client.note) {
          console.log(`     - ${client.note}`);
        }
        if (client.problem) {
          console.log(`     - ${client.problem}`);
        }
      });
      console.log('');
    }
    
    // Show multiple contracts
    if (multipleContractsClients.length > 0) {
      console.log('─'.repeat(80));
      console.log(`\n⚠️  MULTIPLE ACTIVE CONTRACTS (${multipleContractsClients.length}):\n`);
      multipleContractsClients.forEach(client => {
        console.log(`   • ${client.name} (Autotask ID: ${client.autotaskId})`);
        console.log(`     - Total contracts: ${client.totalContracts}, Active: ${client.activeContracts}`);
        console.log(`     - Selected contract ID: ${client.selectedContractId}`);
      });
      console.log('');
    }
    
    // Show errors
    if (errorClients.length > 0) {
      console.log('─'.repeat(80));
      console.log(`\n❌ ERRORS DURING LOOKUP (${errorClients.length}):\n`);
      errorClients.forEach(client => {
        console.log(`   • ${client.name} (Autotask ID: ${client.autotaskId})`);
        console.log(`     - Error: ${client.error}`);
        if (client.errorDetails && typeof client.errorDetails === 'object') {
          console.log(`     - Details: ${JSON.stringify(client.errorDetails).substring(0, 100)}...`);
        }
      });
      console.log('');
    }
    
    console.log('='.repeat(80));
    console.log(`\n📈 SUMMARY BY CONTRACT TYPE:`);
    console.log(`   Block Hours: ${blockHoursClients.length}`);
    console.log(`   Unlimited: ${unlimitedClients.length}`);
    console.log(`   Issues/Not Configured: ${issuesClients.length}`);
    console.log(`   Total: ${allClients.length}\n`);
    
    // Use first Block Hours client for detailed testing if available
    const client = blockHoursClients.length > 0 
      ? allClients.find(c => c.name === blockHoursClients[0].name)
      : (unlimitedClients.length > 0 
          ? allClients.find(c => c.name === unlimitedClients[0].name)
          : null);
    
    if (!client) {
      console.log('⚠️  No clients available for detailed testing');
      return;
    }
    
    // Get contract for detailed testing
    const contract = await getClientContract(client.autotask_id);
    if (!contract) {
      console.log('⚠️  Could not get contract for detailed testing');
      return;
    }
    
    const blocksFound = contract.blocks || await getContractBlocks(contract.id);
    
    // Detailed testing section
    console.log('\n' + '='.repeat(80));
    console.log('\n🔬 DETAILED TESTING - Example Client\n');
    console.log(`Using: ${client.name} (${contract.displayType || 'Unknown Type'})\n`);
    console.log('='.repeat(80));
    
    // Test 1: Display contract details (already fetched)
    console.log('\n📄 Step 1: Contract Details\n');
    console.log('✅ Contract Details:');
    console.log(`   Contract ID: ${contract.id}`);
    console.log(`   Contract Type (numeric): ${contract.contractType || 'N/A'}`);
    console.log(`   Contract Category (numeric): ${contract.contractCategory || 'N/A'}`);
    console.log(`   Status (numeric): ${contract.status || 'N/A'} (1 = Active)`);
    console.log(`   Display Type: ${contract.displayType || 'Unknown'}`);
    console.log(`   Monthly Allocation: ${contract.monthlyAllocation || 'Unlimited'} hours`);
    console.log(`   Is Unlimited: ${contract.isUnlimited ? 'Yes' : 'No'}\n`);
    
    // Show full contract object if this is ADVOCATES OF THE WEST
    if (client.name.toUpperCase().includes('ADVOCATES')) {
      console.log('─'.repeat(60));
      console.log('\n📋 FULL CONTRACT OBJECT FOR ADVOCATES OF THE WEST:\n');
      console.log('   Note: The full contract object from the Autotask API was logged above');
      console.log('   in the getClientContract function. Look for the JSON output.\n');
    }
    
    if (contract.displayType === 'Block Hours') {
      console.log('   🎯 THIS IS A BLOCK HOURS CONTRACT!');
      console.log(`   📊 Contract Type ${contract.contractType} + Category ${contract.contractCategory} = Block Hours`);
      console.log(`   📈 Monthly Allocation: ${contract.monthlyAllocation || 'N/A'} hours\n`);
    } else if (contract.displayType === 'Unlimited') {
      console.log('   ♾️  THIS IS AN UNLIMITED CONTRACT!');
      console.log(`   📊 Contract Type ${contract.contractType} or Category ${contract.contractCategory} = Unlimited\n`);
    } else {
      console.log('   📝 Note: Contract type not yet identified');
      console.log(`      Type: ${contract.contractType}, Category: ${contract.contractCategory}\n`);
    }
    
    // Test 2: Contract blocks (already fetched if found)
    console.log('─'.repeat(60));
    console.log('\n📦 Step 2: Contract Blocks\n');
    
    if (contract.blocks && Array.isArray(contract.blocks) && contract.blocks.length > 0) {
      console.log('✅ Contract Block Details (Already Fetched):');
      console.log(`   Total Blocks: ${contract.blocks.length}`);
      console.log(`   Most Recent Block Hours: ${contract.blocks[0].hours || 'N/A'}`);
      console.log(`   Monthly Allocation: ${contract.monthlyAllocation || 'N/A'} hours\n`);
      blocksFound = contract.blocks;
    } else {
      // Try to get blocks anyway
      const blocks = await getContractBlocks(contract.id);
      if (blocks && Array.isArray(blocks) && blocks.length > 0) {
        console.log('✅ Contract Block Details:');
        console.log(`   Total Blocks: ${blocks.length}`);
        console.log(`   Most Recent Block Hours: ${blocks[0].hours || 'N/A'}\n`);
        blocksFound = blocks;
      } else {
        console.log('⚠️  No blocks found (may be unlimited or not a block hours contract)\n');
      }
    }
    
    // Test 3: Get time entries for different months
    const monthsToTest = [
      { year: 2026, month: 1, label: 'January 2026' },
      { year: 2025, month: 12, label: 'December 2025' },
      { year: 2025, month: 11, label: 'November 2025' }
    ];
    
    console.log('─'.repeat(60));
    console.log('\n⏱️  Step 3: Getting Monthly Time Entries\n');
    
    for (const { year, month, label } of monthsToTest) {
      console.log(`\n📅 ${label}:`);
      try {
        const timeEntries = await getMonthlyTimeEntries(contract.id, year, month);
        console.log(`   ✅ Total Hours: ${timeEntries.totalHours}`);
        console.log(`   ✅ Total Cost: $${timeEntries.totalCost.toFixed(2)}`);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Test completed successfully!\n');
    console.log('Summary:');
    console.log(`   Clients Checked: ${clientsChecked} of ${allClients.length}`);
    console.log(`   Client: ${client.name}`);
    console.log(`   Contract: ${contract ? `ID ${contract.id}, Type: ${contract.contractType}, Category: ${contract.contractCategory}` : 'None'}`);
    console.log(`   Contract Display Type: ${contract?.displayType || 'Unknown'}`);
    if (contract?.displayType === 'Block Hours') {
      const blockHours = blocksFound && Array.isArray(blocksFound) && blocksFound.length > 0 
        ? blocksFound[0].hours 
        : contract.monthlyAllocation;
      console.log(`   Monthly Hours: ${blockHours || contract.monthlyAllocation || 'N/A'}`);
      console.log(`   ✅ Contract Type ${contract.contractType} + Category ${contract.contractCategory} = BLOCK HOURS`);
    } else if (contract?.displayType === 'Unlimited') {
      console.log(`   Monthly Hours: Unlimited`);
      console.log(`   ♾️  Contract Type ${contract.contractType} or Category ${contract.contractCategory} = UNLIMITED`);
    } else {
      const blockHours = blocksFound && Array.isArray(blocksFound) && blocksFound.length > 0 
        ? blocksFound[0].hours 
        : 'Unknown';
      console.log(`   Monthly Hours: ${blockHours}`);
      console.log(`   ⚠️  Contract Type ${contract.contractType}, Category ${contract.contractCategory} = Unknown type`);
    }
    console.log('\n📊 Contract Type Mapping:');
    console.log(`   Type 4 + Category 13 = Block Hours (Monthly: ${contract?.monthlyAllocation || 'from estimatedHours'})`);
    console.log(`   Type 7 OR Category 12 = Unlimited`);
    console.log(`   Current: Type ${contract?.contractType}, Category ${contract?.contractCategory} = ${contract?.displayType || 'Unknown'}`);
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    console.error('\n');
  } finally {
    db.close();
  }
}

// Run the test
if (require.main === module) {
  testContractData();
}

module.exports = { testContractData };
