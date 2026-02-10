const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'northwind.db');
const db = new Database(dbPath);

console.log('=== Checking Unlimited Contracts in Database ===\n');

const unlimitedContracts = db.prepare(`
  SELECT 
    client_id,
    client_name, 
    contract_type,
    month,
    monthly_revenue
  FROM contract_usage 
  WHERE contract_type = 'Unlimited' 
    AND month = '2026-02'
  ORDER BY client_name
`).all();

console.log(`Found ${unlimitedContracts.length} unlimited contracts for February 2026:\n`);

unlimitedContracts.forEach(contract => {
  console.log(`${contract.client_name}: $${contract.monthly_revenue || 'NULL'}`);
});

console.log('\n=== Expected Values ===');
console.log('MSBT LAW: $1778');
console.log('United Way: $1493');
console.log('Bandanna: $265');
console.log('Gem State Roofing: $300');

db.close();
