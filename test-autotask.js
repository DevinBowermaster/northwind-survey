const { testConnection, getAllCompanies } = require('./autotask');

async function test() {
  console.log('🧪 Testing Autotask connection...\n');
  
  // Test connection
  const connected = await testConnection();
  
  if (connected) {
    console.log('\n📋 Fetching first 5 companies...\n');
    const companies = await getAllCompanies();
    
    // Show first 5
    companies.slice(0, 5).forEach(company => {
      console.log(`- ${company.companyName} (ID: ${company.id})`);
    });
  }
}

test();