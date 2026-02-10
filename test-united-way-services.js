/**
 * Fetch and print ContractServices API response for UNITED WAY (or first matching client).
 * Run: node test-united-way-services.js
 */
require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'northwind.db');
const db = new Database(dbPath);

const { getClientContract, getContractServices } = require('./autotask-contracts');

async function main() {
  const client = db.prepare(`
    SELECT id, name, autotask_id
    FROM clients
    WHERE (name LIKE '%UNITED WAY%' OR name LIKE '%United Way%') AND autotask_id IS NOT NULL
    LIMIT 1
  `).get();

  if (!client) {
    console.log('No client found matching UNITED WAY with autotask_id.');
    db.close();
    process.exit(1);
  }

  console.log('\n=== ContractServices API response for:', client.name, '===\n');

  const contract = await getClientContract(client.autotask_id);
  if (!contract) {
    console.log('No active contract found.');
    db.close();
    process.exit(1);
  }

  console.log('Contract ID:', contract.id, '| Type:', contract.displayType, '\n');

  const services = await getContractServices(contract.id, { logRaw: false });

  console.log('Number of services:', services.length, '\n');
  console.log('--- Full raw API response (each item as returned) ---\n');

  services.forEach((s, idx) => {
    console.log(`--- Service ${idx + 1} ---`);
    console.log(JSON.stringify(s.raw, null, 2));
    console.log('');
  });

  console.log('--- Mapped fields we use ---\n');
  services.forEach((s, idx) => {
    console.log(`Service ${idx + 1}:`, s.serviceName || s.raw?.serviceName || '(no name)');
    console.log('  units:', s.units, '| extendedPrice:', s.extendedPrice, '| allocationCodeID:', s.allocationCodeID, '| periodType:', s.periodType);
    console.log('  unitPrice:', s.unitPrice, '| adjustedPrice:', s.adjustedPrice, '| adjustedUnitPrice:', s.adjustedUnitPrice);
    console.log('');
  });

  if (services.length > 0 && services[0].raw) {
    console.log('--- Keys actually returned by API (first service) ---');
    console.log(Object.keys(services[0].raw).sort().join(', '));
  }

  db.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
