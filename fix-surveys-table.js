const db = require('./database');

console.log('🗑️  Dropping old surveys table if exists...');
db.exec('DROP TABLE IF EXISTS surveys');

console.log('📝 Creating surveys table...');
db.exec(`
  CREATE TABLE surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    survey_type TEXT DEFAULT 'Quarterly',
    sent_date TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_date TEXT,
    overall_satisfaction INTEGER,
    response_time INTEGER,
    technical_knowledge INTEGER,
    communication INTEGER,
    recommend_score INTEGER,
    what_we_do_well TEXT,
    what_to_improve TEXT,
    additional_comments TEXT,
    ip_address TEXT,
    user_agent TEXT
  )
`);

console.log('✅ Surveys table created!\n');

// Verify
const columns = db.prepare('PRAGMA table_info(surveys)').all();
console.log('📊 Columns created:');
columns.forEach(col => {
  console.log(`   - ${col.name} (${col.type})`);
});

console.log('\n✅ Done!');