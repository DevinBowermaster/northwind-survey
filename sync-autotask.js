const autotask = require('./autotask');
const db = require('./database');

async function syncFromAutotask() {
  console.log('🔄 Starting Autotask sync...');
  
  try {
    const companies = await autotask.getAllCompanies();
    console.log(`📥 Fetched ${companies.length} companies from Autotask`);
    
    // Use INSERT OR IGNORE for new companies, UPDATE for existing ones
    const insertStmt = db.prepare(`
      INSERT INTO clients (
        autotask_id, name, company_type, send_surveys
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT(autotask_id) DO UPDATE SET
        name = excluded.name,
        company_type = excluded.company_type,
        send_surveys = excluded.send_surveys
    `);
    
    let managedCount = 0;
    let breakFixCount = 0;
    
    for (const company of companies) {
      // companyCategoryID = 100 means MANAGED
      const companyType = company.companyCategoryID === 100 ? 'managed' : 'break-fix';
      const sendSurveys = companyType === 'managed' ? 1 : 0;
      
      insertStmt.run(
        company.id,
        company.companyName,
        companyType,
        sendSurveys
      );
      
      if (companyType === 'managed') managedCount++;
      else breakFixCount++;
    }
    
    // Auto-select primary contacts for companies without emails
    console.log('🎯 Auto-selecting primary contacts...');
    
    const companiesWithoutEmail = db.prepare(`
      SELECT c.autotask_id, c.name
      FROM clients c
      WHERE c.email IS NULL
      AND EXISTS (
        SELECT 1 FROM contacts 
        WHERE company_autotask_id = c.autotask_id 
        AND email IS NOT NULL
      )
    `).all();
    
    let autoSelectedCount = 0;
    
    for (const company of companiesWithoutEmail) {
      const primaryContact = db.prepare(`
        SELECT * FROM contacts 
        WHERE company_autotask_id = ? 
        AND email IS NOT NULL
        ORDER BY is_primary DESC, id ASC
        LIMIT 1
      `).get(company.autotask_id);
      
      if (primaryContact) {
        db.prepare(`
          UPDATE clients 
          SET email = ?, contact_person = ?
          WHERE autotask_id = ?
        `).run(
          primaryContact.email,
          `${primaryContact.first_name} ${primaryContact.last_name}`.trim(),
          company.autotask_id
        );
        autoSelectedCount++;
      }
    }
    
    console.log(`✅ Sync complete!`);
    console.log(`   📊 Total: ${companies.length} companies`);
    console.log(`   🎯 Managed (companyCategoryID=100): ${managedCount}`);
    console.log(`   🔧 Break-Fix: ${breakFixCount}`);
    console.log(`   📧 Auto-selected contacts: ${autoSelectedCount}`);
    
    return {
      success: true,
      total: companies.length,
      managed: managedCount,
      breakFix: breakFixCount
    };
  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  syncFromAutotask()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { syncFromAutotask };