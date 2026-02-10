require('dotenv').config();
const axios = require('axios');

async function checkMavikInAPI() {
  console.log('=== CHECKING MAVIK IN API ===\n');
  
  const apiUrl = 'http://localhost:3000/api/contract-usage/all';
  const response = await axios.get(apiUrl);
  
  const mavikEntries = response.data.filter(c => c.clientName.toUpperCase().includes('MAVIK'));
  
  console.log(`Found ${mavikEntries.length} MAVIK entries:\n`);
  
  mavikEntries.forEach((entry, idx) => {
    console.log(`Entry ${idx + 1}:`);
    console.log(`  Client ID: ${entry.clientId}`);
    console.log(`  Client Name: ${entry.clientName}`);
    console.log(`  Contract Type: ${entry.contractType}`);
    console.log(`  Monthly Hours: ${entry.monthlyHours || 'N/A'}`);
    console.log(`  Monthly Revenue: $${entry.monthlyRevenue || 'NULL'}`);
    console.log();
  });
}

checkMavikInAPI().catch(console.error);
