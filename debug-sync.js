const { getAllCompanies } = require('./autotask');

async function debug() {
  try {
    console.log('Getting all companies...');
    const companies = await getAllCompanies();
    
    console.log('Total companies: ' + companies.length);
    console.log('');
    
    // Check how many have companyCategoryID = 100
    let count100 = 0;
    let sample = [];
    
    companies.forEach(function(company) {
      if (company.companyCategoryID === 100) {
        count100++;
        if (sample.length < 5) {
          sample.push(company.companyName);
        }
      }
    });
    
    console.log('Companies with companyCategoryID = 100: ' + count100);
    console.log('');
    
    if (sample.length > 0) {
      console.log('Sample companies:');
      sample.forEach(function(name) {
        console.log('  - ' + name);
      });
    }
    
    console.log('');
    console.log('Checking first 5 companies to see what fields they have:');
    console.log('');
    
    companies.slice(0, 5).forEach(function(company, index) {
      console.log((index + 1) + '. ' + company.companyName);
      console.log('   companyCategoryID: ' + (company.companyCategoryID || 'MISSING'));
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debug();