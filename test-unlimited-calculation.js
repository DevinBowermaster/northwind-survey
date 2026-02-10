/**
 * Dry-run test: Unlimited Contract Amount calculation (estimatedRevenue / contract length).
 * Does NOT write to the database. Use before pushing to production.
 *
 * Run: node test-unlimited-calculation.js
 * Optional: node test-unlimited-calculation.js "MSBT LAW"   (test one client by name)
 */
require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'northwind.db');
const db = new Database(dbPath);

const { getClientContract } = require('./autotask-contracts');

function contractLengthMonths(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.44));
}

async function main() {
  const filterName = process.argv[2]; // e.g. "MSBT LAW"

  console.log('=== Unlimited Contract Amount (dry-run) ===\n');
  console.log('Uses: monthlyRevenue = estimatedRevenue / contract_length_months (rounded to 2 decimals)\n');

  const query = filterName
    ? db.prepare(`
        SELECT id, name, autotask_id FROM clients
        WHERE company_type = 'managed' AND autotask_id IS NOT NULL
        AND (name LIKE ? OR name = ?)
        ORDER BY name
      `)
    : db.prepare(`
        SELECT id, name, autotask_id FROM clients
        WHERE company_type = 'managed' AND autotask_id IS NOT NULL
        ORDER BY name
      `);

  const clients = filterName
    ? query.all(`%${filterName}%`, filterName)
    : query.all();

  if (clients.length === 0) {
    console.log(filterName ? `No managed clients matching "${filterName}".` : 'No managed clients with autotask_id.');
    db.close();
    process.exit(1);
  }

  console.log(`Testing ${clients.length} client(s)...\n`);

  for (const client of clients) {
    const contract = await getClientContract(client.autotask_id);
    if (!contract) {
      console.log(`${client.name}: No active contract\n`);
      continue;
    }
    if (contract.displayType !== 'Unlimited') {
      console.log(`${client.name}: Skip (not Unlimited, type=${contract.displayType})\n`);
      continue;
    }

    const est = contract.estimatedRevenue;
    const start = contract.startDate;
    const end = contract.endDate;

    if (est == null || est <= 0 || !start || !end) {
      console.log(`${client.name}: Skip Unlimited (missing estimatedRevenue/startDate/endDate)`);
      console.log(`  estimatedRevenue=${est}, startDate=${start}, endDate=${end}\n`);
      continue;
    }

    const months = contractLengthMonths(start, end);
    const monthlyRevenue = months > 0 ? Math.round((est / months) * 100) / 100 : null;

    console.log(`${client.name}:`);
    console.log(`  estimatedRevenue: ${est}`);
    console.log(`  startDate: ${start}, endDate: ${end}`);
    console.log(`  contract length: ${months} months`);
    console.log(`  => Unlimited Contract Amount (monthly): $${monthlyRevenue}\n`);
  }

  db.close();
  console.log('Done (no database writes).');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
