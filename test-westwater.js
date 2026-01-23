const db = require('./database');

// Find West Water
const client = db.prepare('SELECT * FROM clients WHERE name LIKE ?').get('%west%water%');
console.log('West Water client:', client);

if (client) {
  const contacts = db.prepare('SELECT * FROM contacts WHERE company_id = ?').all(client.autotask_id);
  console.log('\nContacts for West Water:');
  console.log('Count:', contacts.length);
  contacts.forEach(c => {
    console.log(`  - ${c.first_name} ${c.last_name} (${c.email || 'no email'})`);
  });
} else {
  console.log('\nWest Water not found! Searching for similar names:');
  const similar = db.prepare('SELECT name, autotask_id FROM clients WHERE name LIKE ? LIMIT 10').all('%water%');
  similar.forEach(s => console.log(`  - ${s.name} (ID: ${s.autotask_id})`));
}