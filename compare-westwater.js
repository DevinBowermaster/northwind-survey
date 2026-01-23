const { autotaskAPI } = require('./autotask');

async function compareWestwater() {
  try {
    console.log('Searching for company ID 2154 (WESTWATER RESEARCH)...');
    console.log('');
    
    // Get company by ID from your screenshot
    const response = await autotaskAPI.get('/Companies/2154');
    const company = response.data.item;
    
    console.log('Company Name: ' + company.companyName);
    console.log('');
    console.log('ALL FIELDS:');
    console.log('');
    
    // Show ALL fields and their values
    Object.keys(company).forEach(function(key) {
      const value = company[key];
      if (value !== null && value !== '') {
        console.log('  ' + key + ': ' + value);
      }
    });
    
    console.log('');
    console.log('Look for any field that might represent "Managed Client"');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

compareWestwater();