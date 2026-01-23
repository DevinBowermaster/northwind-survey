const db = require('./database');

console.log('📊 COMPANY BREAKDOWN:\n');

const stats = db.prepare(`
  SELECT 
    company_type,
    COUNT(*) as count
  FROM clients
  GROUP BY company_type
`).all();

stats.forEach(s => {
  console.log(`${s.company_type}: ${s.count}`);
});

console.log('\n🔍 SAMPLE MANAGED COMPANIES:');
const managed = db.prepare('SELECT name, company_type FROM clients WHERE company_type = ? LIMIT 10').all('managed');
managed.forEach(c => console.log(`  - ${c.name}`));

console.log('\n🔍 SAMPLE BREAK-FIX COMPANIES:');
const breakfix = db.prepare('SELECT name, company_type FROM clients WHERE company_type = ? LIMIT 10').all('break-fix');
breakfix.forEach(c => console.log(`  - ${c.name}`));

console.log('\n📝 The issue: Autotask companyType field values might not be what we expect.');
console.log('Need to check what companyType values Autotask is actually returning.');