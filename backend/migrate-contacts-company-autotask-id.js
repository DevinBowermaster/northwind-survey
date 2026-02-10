require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.NODE_ENV === 'production'
  ? '/opt/render/project/src/data/northwind.db'
  : path.join(__dirname, '..', 'northwind.db');

const db = new Database(dbPath);

/**
 * Migration: Ensure contacts table has company_autotask_id for linking to clients (by Autotask company ID).
 * - If contacts has company_id but not company_autotask_id (e.g. production): add company_autotask_id, copy company_id into it.
 * - If contacts already has company_autotask_id (e.g. after fix-contacts-table.js): no-op.
 * Idempotent and safe for both local and production.
 */
function migrateContactsCompanyAutotaskId() {
  console.log('🔄 Starting migration: contacts company_autotask_id\n');

  try {
    const tableInfo = db.prepare('PRAGMA table_info(contacts)').all();
    if (tableInfo.length === 0) {
      console.log('⚠️  contacts table does not exist — skipping (initDatabase will create it with company_autotask_id)');
      return;
    }

    const columns = tableInfo.map((c) => c.name);
    const hasCompanyId = columns.includes('company_id');
    const hasCompanyAutotaskId = columns.includes('company_autotask_id');

    if (hasCompanyAutotaskId) {
      console.log('✅ contacts already has company_autotask_id — skipping');
      return;
    }

    if (hasCompanyId) {
      console.log('➕ Adding company_autotask_id and copying from company_id...');
      db.exec('ALTER TABLE contacts ADD COLUMN company_autotask_id INTEGER');
      db.exec('UPDATE contacts SET company_autotask_id = company_id');
      console.log('✅ Migration completed: company_autotask_id added and populated\n');
      return;
    }

    console.log('⚠️  contacts has neither company_id nor company_autotask_id — adding nullable company_autotask_id');
    db.exec('ALTER TABLE contacts ADD COLUMN company_autotask_id INTEGER');
    console.log('✅ company_autotask_id column added (update from Autotask sync to populate)\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  migrateContactsCompanyAutotaskId();
  db.close();
  console.log('🔒 Database connection closed');
}

module.exports = { migrateContactsCompanyAutotaskId };
