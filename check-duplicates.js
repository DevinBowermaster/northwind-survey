const db = require('./database');

try {
  // Check for duplicate autotask_ids
  const duplicates = db.prepare(`
    SELECT autotask_id, COUNT(*) as count 
    FROM clients 
    GROUP BY autotask_id 
    HAVING count > 1
  `).all();
  
  console.log('Duplicate autotask_ids: ' + duplicates.length);
  
  if (duplicates.length > 0) {
    console.log('Found duplicates:');
    duplicates.forEach(function(d) {
      console.log('  autotask_id ' + d.autotask_id + ': ' + d.count + ' times');
    });
  }
  
  // Check for NULL autotask_ids
  const nullIds = db.prepare('SELECT COUNT(*) as count FROM clients WHERE autotask_id IS NULL').get();
  console.log('');
  console.log('Companies with NULL autotask_id: ' + nullIds.count);
  
  // Check total unique autotask_ids
  const unique = db.prepare('SELECT COUNT(DISTINCT autotask_id) as count FROM clients WHERE autotask_id IS NOT NULL').get();
  console.log('Unique autotask_ids: ' + unique.count);
  
  console.log('');
  console.log('Total rows in database: 558');
  console.log('If unique autotask_ids = 500, then we have 58 duplicates or nulls');
  
} catch (error) {
  console.error('Error:', error.message);
}