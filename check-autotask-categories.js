const autotask = require('./autotask');

async function checkCategories() {
  console.log('🔍 Checking companyCategoryID values in Autotask...\n');
  
  try {
    const companies = await autotask.getAllCompanies();
    console.log(`📥 Fetched ${companies.length} total companies\n`);
    
    // Count by category ID
    const categories = {};
    
    for (const company of companies) {
      const catId = company.companyCategoryID || 'null';
      if (!categories[catId]) {
        categories[catId] = {
          count: 0,
          examples: []
        };
      }
      categories[catId].count++;
      if (categories[catId].examples.length < 3) {
        categories[catId].examples.push(company.companyName);
      }
    }
    
    console.log('📊 Breakdown by companyCategoryID:\n');
    
    // Sort by count
    const sorted = Object.entries(categories).sort((a, b) => b[1].count - a[1].count);
    
    for (const [catId, data] of sorted) {
      console.log(`Category ${catId}: ${data.count} companies`);
      console.log(`   Examples: ${data.examples.join(', ')}`);
      console.log('');
    }
    
    console.log('\n💡 IMPORTANT:');
    console.log('If you see 558 companies with category 100, that means Autotask actually');
    console.log('HAS 558 managed clients tagged in the system.');
    console.log('\nIf you only want 62 specific ones, you need to either:');
    console.log('1. Fix the tags in Autotask (untag the ones that aren\'t really managed)');
    console.log('2. Manually maintain a list of the 62 you want in the code');
    console.log('3. Use a different field/filter from Autotask');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCategories();