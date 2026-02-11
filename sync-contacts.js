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

    // Support both schemas: contacts may have company_id (or typo copany_id) NOT NULL (legacy) or only company_autotask_id
    const contactColumns = db.prepare('PRAGMA table_info(contacts)').all().map((c) => c.name);
    const companyIdCol = contactColumns.find((c) => c === 'company_id' || c === 'copany_id');
    const hasCompanyId = !!companyIdCol;

    const insertStmt = hasCompanyId
      ? db.prepare(`
          INSERT OR REPLACE INTO contacts (
            autotask_id, company_autotask_id, ${companyIdCol}, first_name, last_name,
            email, phone, title, is_primary, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
      : db.prepare(`
          INSERT OR REPLACE INTO contacts (
            autotask_id, company_autotask_id, first_name, last_name,
            email, phone, title, is_primary, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

    const getClientId = db.prepare('SELECT id FROM clients WHERE autotask_id = ?').pluck();
    const companyExists = db.prepare('SELECT 1 FROM clients WHERE autotask_id = ? LIMIT 1').pluck();

    let insertedCount = 0;
    let withEmail = 0;
    let skippedNoClient = 0;

    // Disable FK during bulk insert (production may have different FK target; we still only insert when company exists)
    db.exec('PRAGMA foreign_keys = OFF');
    try {
    for (const contact of allContacts) {
      const companyAutotaskId = parseInt(contact.companyID, 10);
      if (Number.isNaN(companyAutotaskId) || contact.companyID == null) {
        skippedNoClient++;
        continue;
      }
      // FK: company_autotask_id must exist in clients.autotask_id — skip contacts whose company isn't synced yet
      if (!companyExists.get(companyAutotaskId)) {
        skippedNoClient++;
        continue;
      }
      if (hasCompanyId) {
        const clientId = getClientId.get(companyAutotaskId);
        if (clientId == null) {
          skippedNoClient++;
          continue;
        }
        insertStmt.run(
          contact.id,
          companyAutotaskId,
          clientId,
          contact.firstName || '',
          contact.lastName || '',
          contact.emailAddress || null,
          contact.phone || null,
          contact.title || null,
          contact.isPrimary ? 1 : 0,
          contact.isActive ? 1 : 0
        );
      } else {
        insertStmt.run(
          contact.id,
          companyAutotaskId,
          contact.firstName || '',
          contact.lastName || '',
          contact.emailAddress || null,
          contact.phone || null,
          contact.title || null,
          contact.isPrimary ? 1 : 0,
          contact.isActive ? 1 : 0
        );
      }

      insertedCount++;
      if (contact.emailAddress) withEmail++;
    }

    if (skippedNoClient > 0) {
      console.log(`   ⚠️ Skipped ${skippedNoClient} contacts (no matching company in clients table)`);
    }
    } finally {
      db.exec('PRAGMA foreign_keys = ON');
    }

    // Auto-select primary contacts for companies that don't have one
    console.log('🎯 Auto-selecting primary contacts...');
    
    const companiesWithoutPrimary = db.prepare(`
      SELECT DISTINCT c.id, c.autotask_id, c.name
      FROM clients c
      WHERE c.email IS NULL
      AND EXISTS (
        SELECT 1 FROM contacts 
        WHERE company_autotask_id = c.autotask_id 
        AND email IS NOT NULL
      )
    `).all();
    
    let autoSelectedCount = 0;
    
    for (const company of companiesWithoutPrimary) {
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
    
    console.log(`\n✅ Contact sync complete!`);
    console.log(`   📊 Total Contacts: ${insertedCount}`);
    console.log(`   📧 With Email: ${withEmail}`);
    console.log(`   🎯 Primary Contacts Auto-Selected: ${autoSelectedCount}`);
    
    const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT company_autotask_id) as companies_with_contacts
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