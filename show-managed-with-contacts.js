const db = require('./database');

console.log('🎯 MANAGED CLIENTS WITH CONTACTS:\n');

const managedClientsQuery = db.prepare(`
  SELECT c.id, c.autotask_id, c.name, c.contact_person, c.email
  FROM clients c
  WHERE c.company_type = 'managed'
  AND EXISTS (SELECT 1 FROM contacts WHERE company_id = c.autotask_id)
  LIMIT 50
`);

const managedClients = managedClientsQuery.all().map(client => {
  const contactCount = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE company_id = ?').get(client.autotask_id);
  return { ...client, contact_count: contactCount.count };
}).sort((a, b) => b.contact_count - a.contact_count);

console.log(`Found ${managedClients.length} managed clients with contacts:\n`);

managedClients.forEach((client, i) => {
  console.log(`${i+1}. ${client.name}`);
  console.log(`   Autotask ID: ${client.autotask_id}`);
  console.log(`   Current contact: ${client.contact_person || 'None'}`);
  console.log(`   Current email: ${client.email || 'None'}`);
  console.log(`   👥 ${client.contact_count} contacts in Autotask\n`);
});

const totalManaged = db.prepare('SELECT COUNT(*) as count FROM clients WHERE company_type = ?').get('managed');
console.log(`\nTotal managed clients: ${totalManaged.count}`);
console.log(`Managed with contacts: ${managedClients.length}`);
console.log(`Managed without contacts: ${totalManaged.count - managedClients.length}`);