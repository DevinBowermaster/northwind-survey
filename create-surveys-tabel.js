const db = require('./database');

console.log('Creating surveys table...');

db.exec(`
  CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    survey_type TEXT DEFAULT 'Quarterly',
    sent_date TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_date TEXT,
    
    -- Survey Questions (1-10 scale)
    overall_satisfaction INTEGER,
    response_time INTEGER,
    technical_knowledge INTEGER,
    communication INTEGER,
    recommend_score INTEGER,
    
    -- Open-ended feedback
    what_we_do_well TEXT,
    what_to_improve TEXT,
    additional_comments TEXT,
    
    -- Metadata
    ip_address TEXT,
    user_agent TEXT,
    
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )
`);

console.log('✅ Surveys table created!');

// Check table structure
const tableInfo = db.prepare('PRAGMA table_info(surveys)').all();
console.log('\n📊 Table structure:');
tableInfo.forEach(col => {
  console.log(`   ${col.name}: ${col.type}`);
});