require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.NODE_ENV === 'production'
  ? '/opt/render/project/src/data/northwind.db'
  : path.join(__dirname, '..', 'northwind.db');

const db = new Database(dbPath);

/**
 * Migration: Add discount_amount and effective_hourly_rate (and block_hourly_rate) to contract_usage table.
 * Idempotent: safe to run multiple times.
 */
function migrate() {
  console.log('🔄 Starting migration: Add discount_amount, effective_hourly_rate, block_hourly_rate to contract_usage\n');

  try {
    const tableInfo = db.prepare('PRAGMA table_info(contract_usage)').all();

    if (tableInfo.length === 0) {
      console.error('❌ contract_usage table does not exist. Run migrate-contract-usage.js first.');
      return;
    }

    const columnsToAdd = [
      { name: 'discount_amount', sql: 'ALTER TABLE contract_usage ADD COLUMN discount_amount REAL DEFAULT 0' },
      { name: 'effective_hourly_rate', sql: 'ALTER TABLE contract_usage ADD COLUMN effective_hourly_rate REAL' },
      { name: 'block_hourly_rate', sql: 'ALTER TABLE contract_usage ADD COLUMN block_hourly_rate REAL' }
    ];

    for (const { name, sql } of columnsToAdd) {
      const hasColumn = tableInfo.some((col) => col.name === name);
      if (hasColumn) {
        console.log(`✅ ${name} already exists on contract_usage — skipping`);
      } else {
        console.log(`➕ Adding column ${name}...`);
        db.exec(sql);
        console.log(`✅ Added ${name} successfully`);
      }
    }
    console.log('');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  migrate();
  db.close();
  console.log('🔒 Database connection closed');
}

module.exports = { migrate };
