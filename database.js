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
      autotask_id INTEGER UNIQUE,
      name TEXT NOT NULL,
      contact_person TEXT,
      email TEXT,
      company_type TEXT DEFAULT 'break-fix',
      send_surveys INTEGER DEFAULT 0,
      survey_frequency INTEGER,
      score REAL DEFAULT 0,
      last_survey TEXT,
      next_survey TEXT,
      response_rate TEXT DEFAULT '0%',
      contact_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create contacts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      autotask_id INTEGER UNIQUE NOT NULL,
      company_id INTEGER NOT NULL,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      title TEXT,
      is_primary INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES clients (autotask_id)
    )
  `);

  // Create surveys table (combined with response data)
  db.exec(`
    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      survey_type TEXT DEFAULT 'Quarterly',
      sent_date TEXT,
      overall_satisfaction INTEGER,
      response_time INTEGER,
      technical_knowledge INTEGER,
      communication INTEGER,
      recommend_score INTEGER,
      what_we_do_well TEXT,
      what_to_improve TEXT,
      additional_comments TEXT,
      completed_date TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients (id)
    )
  `);

  // Create survey_templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS survey_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      questions TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
      INSERT INTO clients (name, contact_person, email, company_type, score, last_survey, next_survey, response_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run('Acme Corporation', 'John Smith', 'john@acme.com', 'managed', 8.5, '2025-10-15', '2026-01-15', '100%');
    insert.run('TechStart Inc', 'Sarah Johnson', 'sarah@techstart.com', 'managed', 9.2, '2025-11-01', '2026-02-01', '100%');
    insert.run('Global Logistics', 'Mike Chen', 'mike@globallog.com', 'managed', 6.5, '2025-12-10', '2026-03-10', '75%');
    insert.run('Mountain Medical', 'Lisa Anderson', 'lisa@mountainmed.com', 'managed', 7.8, '2025-09-20', '2025-12-20', '100%');
    insert.run('Riverside Realty', 'Tom Wilson', 'tom@riverside.com', 'break-fix', 0, null, '2026-01-20', '0%');

    console.log('✅ Sample data added');
  }
}

// Initialize on import
initDatabase();
seedDatabase();

// Export database instance
module.exports = db;
