const Database = require('better-sqlite3');
const path = require('path');

// Create/open database file
const db = new Database('northwind.db', { verbose: console.log });

// Initialize database tables
function initDatabase() {
  // Create clients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      email TEXT NOT NULL,
      score REAL DEFAULT 0,
      last_survey TEXT,
      next_survey TEXT,
      response_rate TEXT DEFAULT '0%',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create surveys table
  db.exec(`
    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      score REAL NOT NULL,
      comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients (id)
    )
  `);

  console.log('✅ Database tables initialized');
}

// Insert sample data if database is empty
function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) as count FROM clients').get();
  
  if (count.count === 0) {
    console.log('📝 Seeding database with sample data...');
    
    const insert = db.prepare(`
      INSERT INTO clients (name, contact_person, email, score, last_survey, next_survey, response_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run('Acme Corporation', 'John Smith', 'john@acme.com', 8.5, '2025-10-15', '2026-01-15', '100%');
    insert.run('TechStart Inc', 'Sarah Johnson', 'sarah@techstart.com', 9.2, '2025-11-01', '2026-02-01', '100%');
    insert.run('Global Logistics', 'Mike Chen', 'mike@globallog.com', 6.5, '2025-12-10', '2026-03-10', '75%');
    insert.run('Mountain Medical', 'Lisa Anderson', 'lisa@mountainmed.com', 7.8, '2025-09-20', '2025-12-20', '100%');
    insert.run('Riverside Realty', 'Tom Wilson', 'tom@riverside.com', 0, null, '2026-01-20', '0%');

    console.log('✅ Sample data added');
  }
}

// Initialize on import
initDatabase();
seedDatabase();

// Export database instance
module.exports = db;