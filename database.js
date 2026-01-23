const Database = require('better-sqlite3');
const path = require('path');

// Use persistent disk path in production, local file in development
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/opt/render/project/src/data/northwind.db'
  : 'northwind.db';

// Create/open database file
const db = new Database(dbPath);

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
      is_active INTEGER DEFAULT 1,
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
    console.log('🌱 Seeding database with sample data...');
    
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

// Seed survey templates if none exist
function seedTemplates() {
  const count = db.prepare('SELECT COUNT(*) as count FROM survey_templates').get();
  
  if (count.count === 0) {
    console.log('🌱 Creating survey templates...');
    
    const quarterlyQuestions = JSON.stringify([
      { id: 1, text: "Overall satisfaction with our service", type: "rating" },
      { id: 2, text: "How quickly we respond to your needs", type: "rating" },
      { id: 3, text: "Technical knowledge of our team", type: "rating" },
      { id: 4, text: "Quality of communication", type: "rating" },
      { id: 5, text: "Would you recommend us?", type: "rating" },
      { id: 6, text: "What do we do well?", type: "text" },
      { id: 7, text: "What can we improve?", type: "text" },
      { id: 8, text: "Additional comments", type: "text" }
    ]);
    
    const postTicketQuestions = JSON.stringify([
      { id: 1, text: "How satisfied were you with the resolution?", type: "rating" },
      { id: 2, text: "How quickly was your issue resolved?", type: "rating" },
      { id: 3, text: "How would you rate the technician's knowledge?", type: "rating" },
      { id: 4, text: "Quality of communication during resolution", type: "rating" },
      { id: 5, text: "What went well?", type: "text" },
      { id: 6, text: "What could be improved?", type: "text" }
    ]);
    
    const postProjectQuestions = JSON.stringify([
      { id: 1, text: "Overall satisfaction with the project outcome", type: "rating" },
      { id: 2, text: "Project completed on time", type: "rating" },
      { id: 3, text: "Project stayed within budget", type: "rating" },
      { id: 4, text: "Quality of project management", type: "rating" },
      { id: 5, text: "Technical execution quality", type: "rating" },
      { id: 6, text: "Would you recommend us for similar projects?", type: "rating" },
      { id: 7, text: "What aspects of the project went well?", type: "text" },
      { id: 8, text: "What could we have done better?", type: "text" },
      { id: 9, text: "Additional feedback", type: "text" }
    ]);
    
    const insert = db.prepare(`
      INSERT INTO survey_templates (name, type, questions, active)
      VALUES (?, ?, ?, ?)
    `);
    
    insert.run('Quarterly Check-in', 'Quarterly', quarterlyQuestions, 1);
    insert.run('Post Ticket', 'Post-Ticket', postTicketQuestions, 1);
    insert.run('Post Project', 'Post-Project', postProjectQuestions, 1);
    
    console.log('✅ Survey templates created (Quarterly, Post-Ticket, Post-Project)');
  }
}

// Initialize on import
initDatabase();
// seedDatabase(); // Disabled - using real Autotask data
seedTemplates();

// Export database instance
module.exports = db;