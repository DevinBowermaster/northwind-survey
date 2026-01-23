const { autotaskAPI } = require('./autotask');

async function freshCheck() {
  try {
    console.log('Fetching fresh company data from Autotask...');
    console.log('');
    
    // Search specifically for WESTWATER
    const searchQuery = {
      filter: [
        {
          op: 'contains',
          field: 'companyName',
          value: 'WEST'
        }
      ]
    };
    
    const response = await autotaskAPI.get('/Companies/query?search=' + JSON.stringify(searchQuery));
    
    if (response.data.items.length === 0) {
      console.log('No companies found with WEST in the name.');
      console.log('');
      console.log('Let me fetch ALL companies and show you the first 20:');
      console.log('');
      
      const allResponse = await autotaskAPI.get('/Companies/query?search={"filter":[{"op":"exist","field":"id"}],"MaxRecords":20}');
      
      allResponse.data.items.forEach(function(company, index) {
        console.log((index + 1) + '. ' + company.companyName);
        console.log('   Category ID: ' + (company.companyCategoryID || 'none'));
        console.log('');
      });
      
    } else {
      console.log('Found ' + response.data.items.length + ' companies:');
      console.log('');
      
      response.data.items.forEach(function(company) {
        console.log('Company: ' + company.companyName);
        console.log('  ID: ' + company.id);
        console.log('  Category ID: ' + (company.companyCategoryID || 'NONE'));
        console.log('  Type: ' + company.companyType);
        console.log('  Classification: ' + (company.classification || 'none'));
        console.log('');
        
        if (company.companyCategoryID) {
          console.log('⭐ FOUND IT! Category ID: ' + company.companyCategoryID);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

freshCheck();