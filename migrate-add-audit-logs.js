require('dotenv').config();
const db = require('./database');

/**
 * Migration script to create audit_logs table
 * 
 * Creates the audit_logs table with columns:
 * - id (INTEGER PRIMARY KEY AUTOINCREMENT)
 * - user_email (TEXT NOT NULL)
 * - user_name (TEXT)
 * - action (TEXT NOT NULL)
 * - entity_type (TEXT)
 * - entity_id (INTEGER)
 * - old_value (TEXT)
 * - new_value (TEXT)
 * - timestamp (TEXT DEFAULT CURRENT_TIMESTAMP)
 * 
 * This script is idempotent - safe to run multiple times.
 */

function migrateAddAuditLogs() {
  console.log('🔄 Starting migration: Create audit_logs table\n');
  
  try {
    // Check if audit_logs table exists
    const tableInfo = db.prepare('PRAGMA table_info(audit_logs)').all();
    
    if (tableInfo.length > 0) {
      console.log('✓ audit_logs table already exists, skipping');
      console.log(`📊 Found ${tableInfo.length} columns in audit_logs table`);
      
      // Verify expected columns exist
      const columnNames = tableInfo.map(col => col.name);
      const expectedColumns = ['id', 'user_email', 'user_name', 'action', 'entity_type', 'entity_id', 'old_value', 'new_value', 'timestamp'];
      const missingColumns = expectedColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`⚠️  Warning: Missing columns: ${missingColumns.join(', ')}`);
        console.log('   Consider recreating the table if needed');
      } else {
        console.log('✅ All expected columns are present');
      }
      
      return;
    }
    
    // Table doesn't exist, create it
    console.log('➕ Creating audit_logs table...');
    db.exec(`
      CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        user_name TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        old_value TEXT,
        new_value TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created audit_logs table');
    
    // Verify the migration
    console.log('\n📋 Verifying migration...');
    const verifyInfo = db.prepare('PRAGMA table_info(audit_logs)').all();
    console.log(`✅ Migration completed successfully!`);
    console.log(`📊 Created table with ${verifyInfo.length} columns:`);
    verifyInfo.forEach(col => {
      const nullable = col.notnull === 0 ? ' (nullable)' : '';
      const defaultValue = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
      console.log(`   ✓ ${col.name}: ${col.type}${nullable}${defaultValue}`);
    });
    
  } catch (error) {
    // Handle table already exists errors gracefully (idempotent)
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('⚠️  Table already exists (this is safe to ignore)');
      console.log('✅ Migration already applied - no changes needed');
    } else {
      console.error('❌ Error during migration:', error.message);
      throw error;
    }
  }
}

// Run the migration
if (require.main === module) {
  migrateAddAuditLogs();
  db.close();
  console.log('\n✅ Migration script completed');
}

module.exports = { migrateAddAuditLogs };
