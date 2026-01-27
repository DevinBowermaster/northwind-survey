require('dotenv').config();
const db = require('./database');

/**
 * Migration script to add archive columns to surveys table
 * 
 * Adds:
 * - archived (INTEGER DEFAULT 0) - flag to mark surveys as archived
 * - archived_date (TEXT) - timestamp when survey was archived
 * 
 * This script is idempotent - safe to run multiple times.
 */

function migrateAddArchive() {
  console.log('🔄 Starting migration: Add archive columns to surveys table\n');
  
  try {
    // Get current table structure
    const columns = db.prepare('PRAGMA table_info(surveys)').all();
    const columnNames = columns.map(col => col.name);
    
    console.log(`📊 Found ${columns.length} columns in surveys table`);
    
    // Check if 'archived' column exists
    const hasArchived = columnNames.includes('archived');
    const hasArchivedDate = columnNames.includes('archived_date');
    
    // Add 'archived' column if it doesn't exist
    if (!hasArchived) {
      console.log('➕ Adding "archived" column...');
      db.exec('ALTER TABLE surveys ADD COLUMN archived INTEGER DEFAULT 0');
      console.log('✅ Added "archived" column (INTEGER DEFAULT 0)');
    } else {
      console.log('✓ "archived" column already exists, skipping');
    }
    
    // Add 'archived_date' column if it doesn't exist
    if (!hasArchivedDate) {
      console.log('➕ Adding "archived_date" column...');
      db.exec('ALTER TABLE surveys ADD COLUMN archived_date TEXT');
      console.log('✅ Added "archived_date" column (TEXT)');
    } else {
      console.log('✓ "archived_date" column already exists, skipping');
    }
    
    // Verify the migration
    console.log('\n📋 Verifying migration...');
    const updatedColumns = db.prepare('PRAGMA table_info(surveys)').all();
    const updatedColumnNames = updatedColumns.map(col => col.name);
    
    if (updatedColumnNames.includes('archived') && updatedColumnNames.includes('archived_date')) {
      console.log('✅ Migration completed successfully!');
      console.log('\n📊 Updated table structure:');
      updatedColumns.forEach(col => {
        if (col.name === 'archived' || col.name === 'archived_date') {
          console.log(`   ✓ ${col.name}: ${col.type}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`);
        }
      });
    } else {
      console.log('⚠️  Warning: Migration may not have completed successfully');
    }
    
  } catch (error) {
    // Handle duplicate column errors gracefully (idempotent)
    if (error.message.includes('duplicate column name')) {
      console.log('⚠️  Column already exists (this is safe to ignore)');
      console.log('✅ Migration already applied - no changes needed');
    } else {
      console.error('❌ Error during migration:', error.message);
      throw error;
    }
  }
}

// Run the migration
if (require.main === module) {
  migrateAddArchive();
  db.close();
  console.log('\n✅ Migration script completed');
}

module.exports = { migrateAddArchive };
