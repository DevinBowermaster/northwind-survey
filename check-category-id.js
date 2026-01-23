const { autotaskAPI } = require('./autotask');

async function checkCategoryID() {
  try {
    console.log('Checking companies for category IDs...');
    console.log('');
    
    // Get 100 companies
    const response = await autotaskAPI.get('/Companies/query?search={"filter":[{"op":"exist","field":"id"}],"MaxRecords":100}');
    const companies = response.data.items;
    
    console.log('Found ' + companies.length + ' companies');
    console.log('');
    
    // Group by category ID
    const byCategory = {};
    
    companies.forEach(function(company) {
      const catId = company.companyCategoryID || 'none';
      if (!byCategory[catId]) {
        byCategory[catId] = [];
      }
      byCategory[catId].push(company.companyName);
    });
    
    console.log('Companies grouped by Category ID:');
    console.log('');
    
    Object.keys(byCategory).forEach(function(catId) {
      console.log('Category ID: ' + catId + ' (' + byCategory[catId].length + ' companies)');
      byCategory[catId].slice(0, 5).forEach(function(name) {
        console.log('  - ' + name);
      });
      if (byCategory[catId].length > 5) {
        console.log('  ... and ' + (byCategory[catId].length - 5) + ' more');
      }
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log('');
    console.log('INSTRUCTIONS:');
    console.log('Look at the company names above.');
    console.log('Find a group that contains your managed clients.');
    console.log('That Category ID is what you need!');
    console.log('');
    console.log('If you see "Category ID: none", those companies have no category assigned.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCategoryID();