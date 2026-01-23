const Database = require('better-sqlite3');
const fs = require('fs');

// Backup old database
if (fs.existsSync('northwind.db')) {
  fs.copyFileSync('northwind.db', 'northwind.db.backup');
  console.log('📦 Created backup: northwind.db.backup');
}

// Create new database with correct schema
const db = new Database('northwind.db');

console.log('🔄 Recreating database with correct schema...\n');

// Drop old tables
db.exec('DROP TABLE IF EXISTS surveys');
db.exec('DROP TABLE IF EXISTS clients');

// Create clients table with proper constraints
db.exec(`
  CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    autotask_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    company_type TEXT DEFAULT 'unknown',
    send_surveys INTEGER DEFAULT 1,
    score REAL DEFAULT 0,
    last_survey TEXT,
    next_survey TEXT,
    response_rate TEXT DEFAULT '0%',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✅ Created clients table with autotask_id as UNIQUE');

// Create surveys table
db.exec(`
  CREATE TABLE surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    score REAL NOT NULL,
    comment TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients (id)
  )
`);

console.log('✅ Created surveys table');

console.log('\n✅ Database schema fixed!');
console.log('\nNext step: Run sync-autotask.js to populate with Autotask data');

db.close();