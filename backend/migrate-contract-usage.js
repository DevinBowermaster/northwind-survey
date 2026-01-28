require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

// Use persistent disk path in production, local file in development
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/opt/render/project/src/data/northwind.db'
  : path.join(__dirname, '..', 'northwind.db');

// Create/open database file
const db = new Database(dbPath);

/**
 * Migration script to create contract_usage table
 * 
 * Creates the contract_usage table with columns:
 * - id (INTEGER PRIMARY KEY AUTOINCREMENT)
 * - client_id (INTEGER, FOREIGN KEY to clients.id)
 * - client_name (TEXT)
 * - autotask_company_id (INTEGER)
 * - contract_id (INTEGER)
 * - contract_type (TEXT) - "Block Hours" or "Unlimited"
 * - month (TEXT) - format YYYY-MM
 * - monthly_hours (REAL) - NULL for Unlimited
 * - hours_used (REAL, default 0)
 * - hours_remaining (REAL) - NULL for Unlimited
 * - percentage_used (REAL) - NULL for Unlimited
 * - total_cost (REAL, default 0)
 * - synced_at (DATETIME, default CURRENT_TIMESTAMP)
 * - UNIQUE constraint on (client_id, month)
 * 
 * Creates indexes on:
 * - client_id
 * - month
 * 
 * This script is idempotent - safe to run multiple times.
 */

function migrateContractUsage() {
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
        'client_name',
        'autotask_company_id',
        'contract_id',
        'contract_type',
        'month',
        'monthly_hours',
        'hours_used',
        'hours_remaining',
        'percentage_used',
        'total_cost',
        'synced_at'
      ];
      const missingColumns = expectedColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`⚠️  Warning: Missing columns: ${missingColumns.join(', ')}`);
        console.log('   Consider recreating the table if needed');
      } else {
        console.log('✅ All expected columns are present');
      }
      
      // Check for indexes
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND tbl_name='contract_usage'
      `).all();
      console.log(`📊 Found ${indexes.length} indexes on contract_usage table`);
      
      return;
    }
    
    // Table doesn't exist, create it
    console.log('➕ Creating contract_usage table...');
    db.exec(`
      CREATE TABLE contract_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        client_name TEXT,
        autotask_company_id INTEGER,
        contract_id INTEGER,
        contract_type TEXT,
        month TEXT,
        monthly_hours REAL,
        hours_used REAL DEFAULT 0,
        hours_remaining REAL,
        percentage_used REAL,
        total_cost REAL DEFAULT 0,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, month),
        FOREIGN KEY(client_id) REFERENCES clients(id)
      )
    `);
    console.log('✅ Created contract_usage table');
    
    // Create indexes
    console.log('➕ Creating indexes...');
    db.exec(`
      CREATE INDEX idx_contract_usage_client_id ON contract_usage(client_id)
    `);
    console.log('✅ Created index on client_id');
    
    db.exec(`
      CREATE INDEX idx_contract_usage_month ON contract_usage(month)
    `);
    console.log('✅ Created index on month');
    
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
    
    // Verify indexes
    const verifyIndexes = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND tbl_name='contract_usage'
    `).all();
    console.log(`\n📊 Created ${verifyIndexes.length} indexes:`);
    verifyIndexes.forEach(idx => {
      console.log(`   ✓ ${idx.name}`);
    });
    
  } catch (error) {
    // Handle table already exists errors gracefully (idempotent)
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('⚠️  Table or index already exists (this is safe to ignore)');
      console.log('✅ Migration already applied - no changes needed');
    } else {
      console.error('❌ Error during migration:', error.message);
      throw error;
    }
  }
}

// Run the migration
if (require.main === module) {
  migrateContractUsage();
  db.close();
  console.log('\n✅ Migration script completed');
}

module.exports = { migrateContractUsage };
