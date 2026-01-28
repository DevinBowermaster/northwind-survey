require('dotenv').config();
const db = require('./database');

/**
 * Migration script to create contract_usage table
 * 
 * Creates the contract_usage table with columns:
 * - id (INTEGER PRIMARY KEY AUTOINCREMENT)
 * - client_id (INTEGER)
 * - month (INTEGER, 1-12)
 * - year (INTEGER, 2024, 2025, etc.)
 * - contract_type (TEXT, 'Block Hours' or 'Recurring Service')
 * - contract_hours (REAL, monthly allocation, NULL for unlimited)
 * - is_unlimited (INTEGER, 0 or 1)
 * - billable_hours (REAL, actual hours billed that month)
 * - labor_cost (REAL)
 * - variance (REAL, billable - contract, NULL for unlimited)
 * - contract_snapshot_date (TEXT, when we captured contract terms)
 * - synced_at (TEXT DEFAULT CURRENT_TIMESTAMP)
 * 
 * This script is idempotent - safe to run multiple times.
 */

function migrateAddContractUsage() {
  console.log('🔄 Starting migration: Create contract_usage table\n');
  
  try {
    // Check if contract_usage table exists
    const tableInfo = db.prepare('PRAGMA table_info(contract_usage)').all();
    
    if (tableInfo.length > 0) {
      console.log('✓ contract_usage table already exists, skipping');
      console.log(`📊 Found ${tableInfo.length} columns in contract_usage table`);
      
      // Verify expected columns exist
      const columnNames = tableInfo.map(col => col.name);
      const expectedColumns = [
        'id', 
        'client_id', 
        'month', 
        'year', 
        'contract_type', 
        'contract_hours', 
        'is_unlimited', 
        'billable_hours', 
        'labor_cost', 
        'variance', 
        'contract_snapshot_date', 
        'synced_at'
      ];
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
    console.log('➕ Creating contract_usage table...');
    db.exec(`
      CREATE TABLE contract_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        month INTEGER,
        year INTEGER,
        contract_type TEXT,
        contract_hours REAL,
        is_unlimited INTEGER,
        billable_hours REAL,
        labor_cost REAL,
        variance REAL,
        contract_snapshot_date TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created contract_usage table');
    
    // Verify the migration
    console.log('\n📋 Verifying migration...');
    const verifyInfo = db.prepare('PRAGMA table_info(contract_usage)').all();
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
  migrateAddContractUsage();
  db.close();
  console.log('\n✅ Migration script completed');
}

module.exports = { migrateAddContractUsage };
