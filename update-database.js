const db = require('./database');

function updateDatabase() {
  console.log('🔄 Updating database schema...\n');
  
  try {
    // Add new columns to clients table
    db.exec(`
      ALTER TABLE clients ADD COLUMN company_type TEXT DEFAULT 'unknown';
    `);
    console.log('✅ Added company_type column');
    
    db.exec(`
      ALTER TABLE clients ADD COLUMN send_surveys INTEGER DEFAULT 1;
    `);
    console.log('✅ Added send_surveys column');
    
    db.exec(`
      ALTER TABLE clients ADD COLUMN autotask_id INTEGER;
    `);
    console.log('✅ Added autotask_id column');
    
    console.log('\n✅ Database schema updated successfully!');
    console.log('\nCompany Types:');
    console.log('  - managed: Managed service clients (your 60 clients)');
    console.log('  - break-fix: Break-fix clients');
    console.log('  - prospect: Potential clients');
    console.log('  - inactive: Inactive clients');
    console.log('  - unknown: Not categorized yet');
    
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('⚠️  Columns already exist, skipping...');
    } else {
      console.error('❌ Error updating database:', error.message);
    }
  }
}

updateDatabase();