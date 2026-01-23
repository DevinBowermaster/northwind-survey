const { autotaskAPI } = require('./autotask');

async function getCategories() {
  try {
    console.log('Fetching Company Categories from Autotask...');
    console.log('');
    
    // Query the CompanyCategories endpoint
    const response = await autotaskAPI.get('/CompanyCategories/query?search={"filter":[{"op":"exist","field":"id"}]}');
    const categories = response.data.items;
    
    console.log('Found ' + categories.length + ' Company Categories:');
    console.log('');
    
    categories.forEach(function(cat) {
      console.log('Category: ' + cat.name);
      console.log('  ID: ' + cat.id);
      console.log('  Nickname: ' + (cat.nickname || 'none'));
      console.log('  Active: ' + cat.isActive);
      console.log('  Global Default: ' + (cat.isGlobalDefault || false));
      console.log('');
      
      if (cat.name.toLowerCase().includes('managed')) {
        console.log('  ⭐ THIS ONE! "' + cat.name + '" - Category ID: ' + cat.id);
        console.log('');
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

getCategories();