const { getAllCompanies } = require('./autotask');

async function checkTotal() {
  try {
    const companies = await getAllCompanies();
    
    console.log('');
    console.log('Total companies returned: ' + companies.length);
    console.log('');
    
    // Count by category
    const byCategory = {};
    companies.forEach(function(company) {
      const cat = company.companyCategoryID || 'none';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });
    
    console.log('Companies by category:');
    Object.keys(byCategory).forEach(function(cat) {
      console.log('  Category ' + cat + ': ' + byCategory[cat] + ' companies');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTotal();