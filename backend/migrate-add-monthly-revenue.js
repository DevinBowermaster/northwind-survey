require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

// Use persistent disk path in production, local file in development
const dbPath = process.env.NODE_ENV === 'production'
  ? '/opt/render/project/src/data/northwind.db'
  : path.join(__dirname, '..', 'northwind.db');

const db = new Database(dbPath);

/**
 * Migration: Add monthly_revenue column to contract_usage table
 * ALTER TABLE contract_usage ADD COLUMN monthly_revenue REAL;
 * Idempotent: safe to run multiple times.
 */
function migrateAddMonthlyRevenue() {
  console.log('🔄 Starting migration: Add monthly_revenue to contract_usage\n');

  try {
    const tableInfo = db.prepare('PRAGMA table_info(contract_usage)').all();

    if (tableInfo.length === 0) {
      console.error('❌ contract_usage table does not exist. Run migrate-contract-usage.js first.');
      return;
    }

    const hasColumn = tableInfo.some((col) => col.name === 'monthly_revenue');
    if (hasColumn) {
      console.log('✅ monthly_revenue column already exists on contract_usage — skipping');
      return;
    }

    console.log('➕ Adding column monthly_revenue REAL...');
    db.exec('ALTER TABLE contract_usage ADD COLUMN monthly_revenue REAL');
    console.log('✅ Added monthly_revenue column successfully\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  migrateAddMonthlyRevenue();
  db.close();
  console.log('🔒 Database connection closed');
}

module.exports = { migrateAddMonthlyRevenue };
