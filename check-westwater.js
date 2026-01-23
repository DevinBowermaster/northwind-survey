const { getAllCompanies } = require('./autotask');

async function checkWestwater() {
  try {
    console.log('Looking for WESTWATER RESEARCH...');
    console.log('');
    
    const companies = await getAllCompanies();
    
    const found = companies.find(function(company) {
      return company.companyName.includes('WESTWATER');
    });
    
    if (found) {
      console.log('Found company!');
      console.log('');
      console.log('Company Name: ' + found.companyName);
      console.log('Company ID: ' + found.id);
      console.log('Company Type: ' + found.companyType);
      console.log('Classification: ' + (found.classification || 'none'));
      console.log('Category ID: ' + (found.companyCategoryID || 'NONE'));
      console.log('Active: ' + found.isActive);
      console.log('');
      
      if (found.companyCategoryID) {
        console.log('========================================');
        console.log('⭐ YOUR MANAGED CLIENT CATEGORY ID IS: ' + found.companyCategoryID);
        console.log('========================================');
        console.log('');
        console.log('Use this ID in your sync-autotask.js script!');
      } else {
        console.log('ERROR: No category ID found!');
        console.log('The category might not be synced yet.');
        console.log('Try saving the company in Autotask again.');
      }
    } else {
      console.log('Could not find WESTWATER RESEARCH');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkWestwater();