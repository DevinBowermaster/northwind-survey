const db = require('./database');

console.log('🗑️  Clearing bad sync data...\n');

// Get current counts
const before = db.prepare('SELECT company_type, COUNT(*) as count FROM clients GROUP BY company_type').all();
console.log('Before cleanup:');
before.forEach(b => console.log(`  ${b.company_type}: ${b.count}`));

// Delete all clients that look like individual people (likely leads/prospects)
// These have first name + last name format
const deleteLeads = db.prepare(`
  DELETE FROM clients 
  WHERE name LIKE '% %' 
  AND name NOT LIKE '%LLC%'
  AND name NOT LIKE '%INC%'
  AND name NOT LIKE '%CORP%'
  AND name NOT LIKE '%LTD%'
  AND name NOT LIKE '%GROUP%'
  AND name NOT LIKE '%COMPANY%'
  AND name NOT LIKE '%ASSOCIATES%'
  AND company_type = 'break-fix'
  AND LENGTH(name) < 30
`);

const result = deleteLeads.run();
console.log(`\n🗑️  Deleted ${result.changes} lead/prospect records`);

// Get counts after
const after = db.prepare('SELECT company_type, COUNT(*) as count FROM clients GROUP BY company_type').all();
console.log('\nAfter cleanup:');
after.forEach(a => console.log(`  ${a.company_type}: ${a.count}`));

console.log('\n✅ Cleanup complete!');
console.log('💡 You may need to re-sync from Autotask with proper filters.');