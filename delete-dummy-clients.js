const Database = require('better-sqlite3');
const db = new Database('northwind.db');

const dummyClients = [
  'Acme Corporation',
  'TechStart Inc',
  'Global Logistics',
  'Mountain Medical',
  'Riverside Realty'
];

console.log('Deleting dummy clients...\n');

for (const name of dummyClients) {
  const client = db.prepare('SELECT * FROM clients WHERE name = ?').get(name);
  
  if (client) {
    // Delete associated surveys
    const surveys = db.prepare('DELETE FROM surveys WHERE client_id = ?').run(client.id);
    console.log(`  - Deleted ${surveys.changes} surveys for ${name}`);
    
    // Delete the client
    db.prepare('DELETE FROM clients WHERE id = ?').run(client.id);
    console.log(`  ✅ Deleted ${name}`);
  } else {
    console.log(`  ⚠️  ${name} not found`);
  }
}

const remaining = db.prepare('SELECT COUNT(*) as count FROM clients').get();
console.log(`\n✅ Done! ${remaining.count} clients remaining`);

db.close();
