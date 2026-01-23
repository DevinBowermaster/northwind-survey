const autotask = require('./autotask');
const db = require('./database');

async function syncContactsFromAutotask() {
  console.log('🔄 Starting contact sync from Autotask...');
  
  try {
    let allContacts = [];
    let page = 1;
    const pageSize = 500;
    let hasMore = true;
    
    while (hasMore) {
      console.log(`📥 Fetching page ${page}...`);
      
      const lastContactId = allContacts.length > 0 ? allContacts[allContacts.length - 1].id : null;
      const response = await autotask.queryContacts(page, pageSize, lastContactId);
      
      if (response && response.items && response.items.length > 0) {
        allContacts = allContacts.concat(response.items);
        console.log(`   Got ${response.items.length} contacts (total: ${allContacts.length})`);
        
        if (response.items.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }
    
    console.log(`\n📊 Total contacts fetched: ${allContacts.length}`);
    console.log('💾 Inserting into database...');
    
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO contacts (
        autotask_id, company_id, first_name, last_name, 
        email, phone, title, is_primary, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let insertedCount = 0;
    let withEmail = 0;
    
    for (const contact of allContacts) {
      insertStmt.run(
        contact.id,
        parseInt(contact.companyID),
        contact.firstName || '',
        contact.lastName || '',
        contact.emailAddress || null,
        contact.phone || null,
        contact.title || null,
        contact.isPrimary ? 1 : 0,
        contact.isActive ? 1 : 0
      );
      
      insertedCount++;
      if (contact.emailAddress) withEmail++;
    }
    
    // Auto-select primary contacts for companies that don't have one
    console.log('🎯 Auto-selecting primary contacts...');
    
    const companiesWithoutPrimary = db.prepare(`
      SELECT DISTINCT c.id, c.autotask_id, c.name
      FROM clients c
      WHERE c.email IS NULL
      AND EXISTS (
        SELECT 1 FROM contacts 
        WHERE company_id = c.autotask_id 
        AND email IS NOT NULL
      )
    `).all();
    
    let autoSelectedCount = 0;
    
    for (const company of companiesWithoutPrimary) {
      const primaryContact = db.prepare(`
        SELECT * FROM contacts 
        WHERE company_id = ? 
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
    
    console.log(`\n✅ Contact sync complete!`);
    console.log(`   📊 Total Contacts: ${insertedCount}`);
    console.log(`   📧 With Email: ${withEmail}`);
    console.log(`   🎯 Primary Contacts Auto-Selected: ${autoSelectedCount}`);
    
    const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT company_id) as companies_with_contacts
      FROM contacts
    `).get();
    
    console.log(`   🏢 Companies with Contacts: ${stats.companies_with_contacts}`);
    
    return {
      success: true,
      total: insertedCount,
      withEmail: withEmail,
      autoSelected: autoSelectedCount
    };
    
  } catch (error) {
    console.error('❌ Contact sync failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  syncContactsFromAutotask()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { syncContactsFromAutotask };