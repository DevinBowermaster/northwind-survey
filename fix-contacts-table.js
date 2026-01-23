const db = require('./database');

console.log('🔧 Fixing contacts table...\n');

// Drop the old table
db.exec('DROP TABLE IF EXISTS contacts');

// Recreate with correct schema
db.exec(`
  CREATE TABLE contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    autotask_id INTEGER UNIQUE NOT NULL,
    company_autotask_id INTEGER NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    title TEXT,
    is_primary INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✅ Contacts table recreated successfully!');
console.log('✅ Removed company_id field - using company_autotask_id instead\n');
console.log('Now run: node sync-contacts.js');