require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const { getClientContract, getContractServices, getMonthlyTimeEntries } = require('../autotask-contracts');

// Use persistent disk path in production, local file in development
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/opt/render/project/src/data/northwind.db'
  : path.join(__dirname, '..', 'northwind.db');

// Create/open database file
const db = new Database(dbPath);

/**
 * Get the last three months in YYYY-MM format
 * @returns {Array<string>} Array of month strings, e.g. ['2026-01', '2025-12', '2025-11']
 */
function getLastThreeMonths() {
  const months = [];
  const now = new Date();
  
  for (let i = 0; i < 3; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }
  
  return months;
}

/**
 * Sync contract usage data from Autotask for all managed clients
 */
async function syncContractUsage() {
  console.log('🔄 Starting Contract Usage Sync...\n');
  
  const lastThreeMonths = getLastThreeMonths();
  console.log(`📅 Syncing data for months: ${lastThreeMonths.join(', ')}\n`);
  
  // Get all managed clients
  const clients = db.prepare(`
    SELECT id, autotask_id, name
    FROM clients
    WHERE company_type = 'managed' AND autotask_id IS NOT NULL
    ORDER BY name
  `).all();
  
  if (clients.length === 0) {
    console.log('⚠️  No managed clients found in database');
    return;
  }
  
  console.log(`📊 Found ${clients.length} managed clients to sync\n`);
  
  // Prepare INSERT OR UPDATE statement
  const insertOrUpdate = db.prepare(`
    INSERT INTO contract_usage (
      client_id,
      client_name,
      autotask_company_id,
      contract_id,
      contract_type,
      month,
      monthly_hours,
      hours_used,
      hours_remaining,
      percentage_used,
      total_cost,
      monthly_revenue,
      overage_amount,
      synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(client_id, month) DO UPDATE SET
      client_name = excluded.client_name,
      autotask_company_id = excluded.autotask_company_id,
      contract_id = excluded.contract_id,
      contract_type = excluded.contract_type,
      monthly_hours = excluded.monthly_hours,
      hours_used = excluded.hours_used,
      hours_remaining = excluded.hours_remaining,
      percentage_used = excluded.percentage_used,
      total_cost = excluded.total_cost,
      monthly_revenue = excluded.monthly_revenue,
      overage_amount = excluded.overage_amount,
      synced_at = CURRENT_TIMESTAMP
  `);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  // Process each client
  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const progress = `[${i + 1}/${clients.length}]`;
    process.stdout.write(`${progress} ${client.name}... `);
    
    try {
      // Get contract for this client
      const contract = await getClientContract(client.autotask_id);
      
      if (!contract) {
        errorCount++;
        errors.push({
          client: client.name,
          error: 'No active contract found'
        });
        console.log('❌ No contract');
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      // Unlimited contract amount: sum of all contract services (ContractServices entity has no periodType in REST response).
      // Use adjustedPrice when present, else unitPrice.
      let monthlyRevenue = null;
      try {
        if (contract.displayType === 'Unlimited') {
          const services = await getContractServices(contract.id);
          const monthlyTotal = services.reduce((sum, s) => {
            const price = s.adjustedPrice != null ? s.adjustedPrice : (s.unitPrice || 0);
            return sum + price;
          }, 0);
          monthlyRevenue = monthlyTotal > 0 ? Math.round(monthlyTotal * 100) / 100 : null;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (revenueError) {
        console.warn(`\n     ⚠️  Unlimited contract amount skipped for ${client.name}: ${revenueError.message}`);
        monthlyRevenue = null;
      }

      // Block hourly rate (for overage_amount only): current or most recent block
      let blockHourlyRate = null;
      if (contract.displayType === 'Block Hours' && contract.blocks && contract.blocks.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentBlock = contract.blocks.find(b => {
          if (!b.startDate || !b.endDate) return false;
          const start = new Date(b.startDate);
          const end = new Date(b.endDate);
          end.setHours(23, 59, 59, 999);
          return today >= start && today <= end;
        });
        const block = currentBlock || contract.blocks[0];
        blockHourlyRate = block.hourlyRate != null && block.hourlyRate > 0 ? block.hourlyRate : null;
      }
      
      // Process each month
      let monthSuccess = 0;
      let monthErrors = 0;
      
      for (const monthStr of lastThreeMonths) {
        try {
          const [year, month] = monthStr.split('-').map(Number);
          
          // Get time entries for this month
          const timeEntries = await getMonthlyTimeEntries(contract.id, year, month);
          
          // Calculate values
          const hoursUsed = timeEntries.totalHours || 0;
          const totalCost = timeEntries.totalCost || 0;
          
          let monthlyHours = null;
          let hoursRemaining = null;
          let percentageUsed = null;
          
          // Only calculate for Block Hours contracts
          if (contract.displayType === 'Block Hours' && contract.monthlyAllocation) {
            monthlyHours = contract.monthlyAllocation;
            hoursRemaining = Math.max(0, monthlyHours - hoursUsed);
            percentageUsed = monthlyHours > 0 ? (hoursUsed / monthlyHours) * 100 : 0;
          }

          // Overage amount: Block Hours only, when hours used exceeds allocation
          let overageAmount = null;
          if (contract.displayType === 'Block Hours' && monthlyHours != null && hoursUsed > monthlyHours && blockHourlyRate != null) {
            const overageHours = hoursUsed - monthlyHours;
            overageAmount = Math.round(overageHours * blockHourlyRate * 100) / 100;
          }
          
          // Insert or update
          insertOrUpdate.run(
            client.id,
            client.name,
            client.autotask_id,
            contract.id,
            contract.displayType || 'Unknown',
            monthStr,
            monthlyHours,
            hoursUsed,
            hoursRemaining,
            percentageUsed,
            totalCost,
            monthlyRevenue,
            overageAmount
          );
          
          monthSuccess++;
          
        } catch (monthError) {
          monthErrors++;
          console.error(`\n     ⚠️  Error for ${monthStr}: ${monthError.message}`);
        }
        
        // Small delay between months
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (monthErrors === 0) {
        successCount++;
        console.log(`✅ (${monthSuccess} months)`);
      } else {
        errorCount++;
        errors.push({
          client: client.name,
          error: `Failed to sync ${monthErrors} of ${lastThreeMonths.length} months`
        });
        console.log(`⚠️  (${monthSuccess}/${lastThreeMonths.length} months)`);
      }
      
      // Small delay between clients
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      errorCount++;
      errors.push({
        client: client.name,
        error: error.message
      });
      console.log(`❌ Error: ${error.message.substring(0, 50)}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SYNC SUMMARY\n');
  console.log('='.repeat(80));
  console.log(`✅ Successfully synced: ${successCount} clients`);
  console.log(`❌ Errors: ${errorCount} clients`);
  console.log(`📅 Months processed: ${lastThreeMonths.join(', ')}`);
  console.log(`📈 Total records: ${successCount * lastThreeMonths.length} month records\n`);
  
  if (errors.length > 0) {
    console.log('⚠️  ERRORS:\n');
    errors.forEach((err, index) => {
      console.log(`   ${index + 1}. ${err.client}: ${err.error}`);
    });
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('\n✅ Contract usage sync completed\n');
}

// Run the sync if called directly
if (require.main === module) {
  syncContractUsage()
    .catch(error => {
      console.error('\n❌ Fatal error during sync:', error);
      process.exit(1);
    })
    .finally(() => {
      db.close();
      console.log('🔒 Database connection closed');
    });
}

module.exports = { syncContractUsage, getLastThreeMonths };
