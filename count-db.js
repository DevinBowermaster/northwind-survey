const db = require('./database');

try {
  const total = db.prepare('SELECT COUNT(*) as count FROM clients').get();
  const managed = db.prepare('SELECT COUNT(*) as count FROM clients WHERE company_type = ?').get('managed');
  const breakfix = db.prepare('SELECT COUNT(*) as count FROM clients WHERE company_type = ?').get('break-fix');
  
  console.log('Database counts:');
  console.log('  Total: ' + total.count);
  console.log('  Managed: ' + managed.count);
  console.log('  Break-fix: ' + breakfix.count);
  
} catch (error) {
  console.error('Error:', error.message);
}