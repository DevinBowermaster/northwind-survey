/**
 * Test: show exactly what we pull from the API for each Unlimited managed client
 * and the computed "Unlimited contract amount". Use this to dial in the logic.
 *
 * Run: node test-unlimited-amounts.js
 *      node test-unlimited-amounts.js "GEM"     (only clients with GEM in name)
 */
require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'northwind.db');
const db = new Database(dbPath);

const { getClientContract, getContractServices } = require('./autotask-contracts');

// Same formula as sync
function computeLineTotal(s) {
  const u = s.units != null && s.units > 0 ? s.units : 1;
  return (s.extendedPrice != null && s.extendedPrice > 0 ? s.extendedPrice : null)
    ?? (s.adjustedPrice != null ? s.adjustedPrice : null)
    ?? (s.adjustedUnitPrice != null ? s.adjustedUnitPrice * u : null)
    ?? ((s.unitPrice != null ? s.unitPrice : 0) * u);
}

async function main() {
  const nameFilter = process.argv[2]; // e.g. "GEM"

  const clients = db.prepare(`
    SELECT id, name, autotask_id
    FROM clients
    WHERE company_type = 'managed' AND autotask_id IS NOT NULL
    ORDER BY name
  `).all();

  const filtered = nameFilter
    ? clients.filter((c) => c.name.toLowerCase().includes(nameFilter.toLowerCase()))
    : clients;

  if (filtered.length === 0) {
    console.log(nameFilter ? `No managed clients matching "${nameFilter}".` : 'No managed clients.');
    db.close();
    process.exit(1);
  }

  console.log('\n=== Unlimited contract amounts: values pulled from API ===\n');
  if (nameFilter) console.log(`Filter: "${nameFilter}"\n`);

  for (const client of filtered) {
    const contract = await getClientContract(client.autotask_id);
    if (!contract) {
      console.log(`${client.name}: No active contract\n`);
      continue;
    }
    if (contract.displayType !== 'Unlimited') {
      console.log(`${client.name}: ${contract.displayType} (skipped)\n`);
      continue;
    }

    const services = await getContractServices(contract.id);
    const u = (s) => (s.units != null && s.units > 0 ? s.units : 1);

    let total = 0;
    console.log(`--- ${client.name} (contract ID ${contract.id}) ---`);
    console.log('Service name                    | extPrice | adjPrice | adjUnitPrice | unitPrice | units | LINE TOTAL');
    console.log('-'.repeat(95));

    for (const s of services) {
      const lineTotal = computeLineTotal(s);
      total += lineTotal;
      const name = (s.serviceName || '(no name)').slice(0, 28).padEnd(28);
      const ext = (s.extendedPrice != null ? s.extendedPrice : '-').toString().padStart(8);
      const adj = (s.adjustedPrice != null ? s.adjustedPrice : '-').toString().padStart(8);
      const adjU = (s.adjustedUnitPrice != null ? s.adjustedUnitPrice : '-').toString().padStart(12);
      const uP = (s.unitPrice != null ? s.unitPrice : '-').toString().padStart(9);
      const un = (s.units != null ? s.units : 1).toString().padStart(5);
      console.log(`${name} | ${ext} | ${adj} | ${adjU} | ${uP} | ${un} | ${lineTotal.toFixed(2)}`);
    }

    console.log('-'.repeat(95));
    console.log(`TOTAL (what we store as Unlimited amount): $${total.toFixed(2)}\n`);
    await new Promise((r) => setTimeout(r, 150));
  }

  db.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
