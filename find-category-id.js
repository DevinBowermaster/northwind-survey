const { autotaskAPI } = require('./autotask');

async function findCategoryID() {
  try {
    console.log('🔍 Finding Company Category IDs...\n');
    
    // Get company field information
    const response = await autotaskAPI.get('/Companies/entityInformation/fields');
    
    // Find the category field
    const categoryField = response.data.fields.find(f => 
      f.name === 'companyCategory' || 
      f.name === 'companyCategoryID'
    );
    
    if (categoryField && categoryField.picklistValues) {
      console.log('📋 Available Company Categories:\n');
      categoryField.picklistValues.forEach(cat => {
        console.log(`  ${cat.label.padEnd(30)} → ID: ${cat.value}`);
        if (cat.label.toLowerCase().includes('managed')) {
          console.log(`     ⭐ THIS ONE! Use ID: ${cat.value}`);
        }
      });
      
      console.log('\n💡 Look for "Managed Client" in the list above.');
      console.log('   Copy its ID number - you\'ll need it for the sync script!\n');
      
    } else {
      console.log('⚠️  Could not find category field.');
      console.log('   Your Autotask might use a different field name.');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

findCategoryID();