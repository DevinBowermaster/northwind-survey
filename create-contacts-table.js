const db = require('./database');

// Create contacts table
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    autotask_id INTEGER UNIQUE NOT NULL,
    company_id INTEGER NOT NULL,
    company_autotask_id INTEGER NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    title TEXT,
    is_primary INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES clients(id)
  )
`);

console.log('✅ Contacts table created successfully!');