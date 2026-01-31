require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.NODE_ENV === 'production'
  ? '/opt/render/project/src/data/northwind.db'
  : path.join(__dirname, '..', 'northwind.db');

const db = new Database(dbPath);

/**
 * Migration: Add overage_amount column to contract_usage table
 * Idempotent: safe to run multiple times.
 */
function migrateAddOverageAmount() {
  console.log('🔄 Starting migration: Add overage_amount to contract_usage\n');

  try {
    const tableInfo = db.prepare('PRAGMA table_info(contract_usage)').all();

    if (tableInfo.length === 0) {
      console.error('❌ contract_usage table does not exist. Run migrate-contract-usage.js first.');
      return;
    }

    const hasColumn = tableInfo.some((col) => col.name === 'overage_amount');
    if (hasColumn) {
      console.log('✅ overage_amount column already exists on contract_usage — skipping');
      return;
    }

    console.log('➕ Adding column overage_amount REAL...');
    db.exec('ALTER TABLE contract_usage ADD COLUMN overage_amount REAL');
    console.log('✅ Added overage_amount column successfully\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  migrateAddOverageAmount();
  db.close();
  console.log('🔒 Database connection closed');
}

module.exports = { migrateAddOverageAmount };
