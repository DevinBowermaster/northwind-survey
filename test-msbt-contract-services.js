/**
 * Test script: fetch ContractServices for MSBT LAW (expected Unlimited ~$1,778)
 * and print raw API data to identify correct field/calculation.
 *
 * Run: node test-msbt-contract-services.js
 */
require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.NODE_ENV === 'production'
  ? '/opt/render/project/src/data/northwind.db'
  : path.join(__dirname, 'northwind.db');

const db = new Database(dbPath);

const { getClientContract, getContractServices } = require('./autotask-contracts');

const EXPECTED_AMOUNT = 1778;

async function main() {
  console.log('=== MSBT LAW ContractServices debug ===\n');

  const client = db.prepare(`
    SELECT id, name, autotask_id
    FROM clients
    WHERE name LIKE '%MSBT%' OR name LIKE '%msbt%'
    LIMIT 1
  `).get();

  if (!client) {
    console.log('No client found matching MSBT. Clients with "MSBT" in name:');
    const all = db.prepare(`SELECT id, name, autotask_id FROM clients WHERE name LIKE '%MSBT%' OR name LIKE '%msbt%'`).all();
    console.log(all.length ? all : 'None.');
    db.close();
    process.exit(1);
  }

  console.log(`Client: ${client.name} (id=${client.id}, autotask_id=${client.autotask_id})\n`);

  if (!client.autotask_id) {
    console.log('Client has no autotask_id. Exiting.');
    db.close();
    process.exit(1);
  }

  const contract = await getClientContract(client.autotask_id);
  if (!contract) {
    console.log('No active contract found for this client.');
    db.close();
    process.exit(1);
  }

  console.log(`Contract: id=${contract.id}, displayType=${contract.displayType}\n`);

  if (contract.displayType !== 'Unlimited') {
    console.log('Contract is not Unlimited. Raw ContractServices may still be useful.');
  }

  console.log('--- Fetching ContractServices (logRaw: true) ---\n');
  const services = await getContractServices(contract.id, { logRaw: true });

  console.log('\n--- Mapped fields summary ---');
  services.forEach((s, i) => {
    console.log(`\nService ${i + 1}:`, s.serviceName || '(no name)');
    console.log('  unitPrice:', s.unitPrice, '| adjustedPrice:', s.adjustedPrice);
    console.log('  units:', s.units, '| extendedPrice:', s.extendedPrice);
    console.log('  internalCurrencyUnitPrice:', s.internalCurrencyUnitPrice, '| internalCurrencyAdjustedPrice:', s.internalCurrencyAdjustedPrice);
    console.log('  description:', (s.description || '').substring(0, 60));
  });

  const sumAdjusted = services.reduce((sum, s) => sum + (s.adjustedPrice != null ? s.adjustedPrice : s.unitPrice || 0), 0);
  const sumUnitPrice = services.reduce((sum, s) => sum + (s.unitPrice || 0), 0);
  const sumExtended = services.reduce((sum, s) => sum + (s.extendedPrice || 0), 0);

  console.log('\n--- Totals (for comparison with expected $1,778) ---');
  console.log('Sum(adjustedPrice ?? unitPrice):', sumAdjusted.toFixed(2));
  console.log('Sum(unitPrice):', sumUnitPrice.toFixed(2));
  console.log('Sum(extendedPrice):', sumExtended.toFixed(2));
  console.log('Expected: $' + EXPECTED_AMOUNT);

  db.close();
  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
