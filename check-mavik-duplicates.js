const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'northwind.db');
const db = new Database(dbPath);

console.log('=== CHECKING MAVIK DUPLICATES ===\n');

// Check contacts table
const contacts = db.prepare(`
  SELECT id, name, autotask_id, is_managed, company_type
  FROM contacts 
  WHERE name LIKE '%MAVIK%'
  ORDER BY name
`).all();

console.log(`Found ${contacts.length} MAVIK entries in contacts table:\n`);
contacts.forEach(c => {
  console.log(`ID: ${c.id}, Name: ${c.name}, Autotask ID: ${c.autotask_id}, Managed: ${c.is_managed}`);
});

// Check contract_usage table
const usage = db.prepare(`
  SELECT client_id, client_name, contract_type, monthly_hours, monthly_revenue
  FROM contract_usage 
  WHERE client_name LIKE '%MAVIK%' AND month = '2026-02'
  ORDER BY client_name
`).all();

console.log(`\nFound ${usage.length} MAVIK entries in contract_usage for Feb 2026:\n`);
usage.forEach(u => {
  console.log(`Client ID: ${u.client_id}, Name: ${u.client_name}, Type: ${u.contract_type}`);
  console.log(`  Hours: ${u.monthly_hours}, Revenue: $${u.monthly_revenue}`);
});

db.close();
