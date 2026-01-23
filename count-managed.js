const { autotaskAPI } = require('./autotask');

async function countManaged() {
  try {
    console.log('Checking how many companies have Category ID: 100...');
    console.log('');
    
    // Query companies with companyCategoryID = 100
    const response = await autotaskAPI.get('/Companies/query?search={"filter":[{"op":"eq","field":"companyCategoryID","value":"100"}]}');
    const companies = response.data.items;
    
    console.log('Found ' + companies.length + ' companies with "Managed Client" category');
    console.log('');
    
    if (companies.length > 0) {
      console.log('Companies with Managed Client category:');
      companies.forEach(function(company, index) {
        console.log('  ' + (index + 1) + '. ' + company.companyName);
      });
      console.log('');
      
      if (companies.length >= 60) {
        console.log('✅ Great! You have ' + companies.length + ' managed clients assigned.');
        console.log('Ready to sync!');
      } else {
        console.log('⚠️  You have ' + companies.length + ' companies assigned.');
        console.log('You mentioned having ~65 managed clients.');
        console.log('You may need to assign the category to more companies.');
      }
    } else {
      console.log('⚠️  No companies found with category 100');
      console.log('Make sure you assigned "Managed Client" category to your companies.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

countManaged();