require('dotenv').config();
const axios = require('axios');

async function analyzeAllUnlimited() {
  console.log('=== ANALYZING ALL UNLIMITED CONTRACTS ===\n');
  
  const apiUrl = 'http://localhost:3000/api/contract-usage/all';
  const response = await axios.get(apiUrl);
  const unlimitedContracts = response.data.filter(c => c.contractType === 'Unlimited');
  
  // Expected values from user
  const expected = {
    'BANDANNA': 265,
    'GEM STATE ROOFING': 300,
    'HEALTH 2 BUSINESS': 670,
    'MANZO GENERAL CONTRACTING': 636,
    'MSBT LAW': 1778,
    'PAMELA': 200,
    'REED ALLIED': 324,
    'REVWERX': 675,
    'SOUTHWORTH': 500,
    'THE CORE GROUP': 500,
    'UNITED WAY': 1493,
    'VIKING VET - IDAHO FALLS': 150,
    'VIKING VET - MOSCOW': 200,
    'WILDLAND FIREFIGHTERS': 300,
    'VIEGEAR': 400
  };
  
  console.log('Comparing API results to expected values:\n');
  
  const correct = [];
  const incorrect = [];
  
  unlimitedContracts.forEach(contract => {
    const actual = contract.monthlyRevenue;
    
    // Find expected value by matching client name
    let expectedValue = null;
    let matchedKey = null;
    for (const [key, value] of Object.entries(expected)) {
      if (contract.clientName.toUpperCase().includes(key)) {
        expectedValue = value;
        matchedKey = key;
        break;
      }
    }
    
    if (expectedValue !== null) {
      const diff = Math.abs(actual - expectedValue);
      const isCorrect = diff < 5; // within $5
      
      const result = {
        name: contract.clientName,
        actual,
        expected: expectedValue,
        diff,
        status: isCorrect ? '✓' : '✗'
      };
      
      if (isCorrect) {
        correct.push(result);
      } else {
        incorrect.push(result);
      }
      
      console.log(`${result.status} ${contract.clientName}`);
      console.log(`   Actual: $${actual}, Expected: $${expectedValue}, Diff: $${diff.toFixed(2)}`);
    }
  });
  
  console.log('\n=== SUMMARY ===');
  console.log(`✓ Correct: ${correct.length}`);
  console.log(`✗ Incorrect: ${incorrect.length}`);
  
  if (incorrect.length > 0) {
    console.log('\n=== CONTRACTS NEEDING INVESTIGATION ===');
    incorrect.forEach(c => {
      console.log(`${c.name}: showing $${c.actual}, should be $${c.expected}`);
    });
  }
}

analyzeAllUnlimited().catch(console.error);
