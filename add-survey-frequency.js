const Database = require('better-sqlite3');
const db = new Database('northwind.db');

console.log('Adding survey_frequency column to clients table...');

try {
  db.exec(`
    ALTER TABLE clients 
    ADD COLUMN survey_frequency INTEGER DEFAULT 90
  `);
  
  console.log('✅ survey_frequency column added successfully');
  console.log('   Default value: 90 days');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('ℹ️  Column already exists, skipping');
  } else {
    console.error('❌ Error:', error.message);
  }
}

db.close();
