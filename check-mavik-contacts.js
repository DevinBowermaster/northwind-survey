const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'northwind.db');
const db = new Database(dbPath);

console.log('=== CHECKING CONTACTS TABLE FOR MAVIK ===\n');

const mavikContacts = db.prepare(`
  SELECT id, company_name, autotask_id, is_managed, company_type
  FROM contacts 
  WHERE company_name LIKE '%MAVIK%'
  ORDER BY id
`).all();

console.log(`Found ${mavikContacts.length} MAVIK entries in contacts table:\n`);

mavikContacts.forEach(contact => {
  console.log(`Contact ID: ${contact.id}`);
  console.log(`  Company Name: ${contact.company_name}`);
  console.log(`  Autotask ID: ${contact.autotask_id}`);
  console.log(`  Is Managed: ${contact.is_managed}`);
  console.log(`  Company Type: ${contact.company_type}`);
  console.log();
});

console.log('=== RECOMMENDATION ===');
console.log('If contact with Autotask ID 2364 has is_managed = 1,');
console.log('it should be set to is_managed = 0 (not a managed client, SaaS only)');

db.close();
