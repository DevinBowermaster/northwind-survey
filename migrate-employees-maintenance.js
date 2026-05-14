const path = require('path');
const Database = require('better-sqlite3');

/**
 * Idempotent: employees table + clients.maintenance_employee_id (FK).
 * Autotask sync only updates name/company_type/send_surveys — never this column.
 */
function migrateEmployeesAndMaintenance(db) {
  const hasEmployees = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='employees'")
    .get();
  if (!hasEmployees) {
    db.exec(`
      CREATE TABLE employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    console.log('✅ Migration: created employees table');
  }

  const clientCols = db.prepare('PRAGMA table_info(clients)').all().map((c) => c.name);
  if (!clientCols.includes('maintenance_employee_id')) {
    db.exec('ALTER TABLE clients ADD COLUMN maintenance_employee_id INTEGER REFERENCES employees(id)');
    console.log('✅ Migration: added clients.maintenance_employee_id');
  }
}

if (require.main === module) {
  require('dotenv').config();
  const dbPath =
    process.env.NODE_ENV === 'production'
      ? '/opt/render/project/src/data/northwind.db'
      : path.join(__dirname, 'northwind.db');
  const db = new Database(dbPath);
  try {
    migrateEmployeesAndMaintenance(db);
  } finally {
    db.close();
  }
}

module.exports = { migrateEmployeesAndMaintenance };
