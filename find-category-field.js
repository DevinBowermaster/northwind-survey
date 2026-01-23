const { autotaskAPI } = require('./autotask');

async function findCategoryField() {
  try {
    console.log('Looking for category-related fields in Company entity...');
    console.log('');
    
    const response = await autotaskAPI.get('/Companies/entityInformation/fields');
    const fields = response.data.fields;
    
    console.log('Fields with "category" in the name:');
    console.log('');
    
    fields.forEach(function(field) {
      if (field.name.toLowerCase().includes('category')) {
        console.log('Field Name: ' + field.name);
        console.log('  Label: ' + field.label);
        console.log('  Data Type: ' + field.dataType);
        console.log('  Is Picklist: ' + (field.picklistValues ? 'Yes' : 'No'));
        console.log('');
      }
    });
    
    console.log('Now let\'s check WESTWATER RESEARCH to see what field has value 100...');
    console.log('');
    
    const companyResponse = await autotaskAPI.get('/Companies/2154');
    const company = companyResponse.data.item;
    
    console.log('All fields on WESTWATER RESEARCH with value 100:');
    console.log('');
    
    Object.keys(company).forEach(function(key) {
      if (company[key] === 100 || company[key] === '100') {
        console.log('⭐ FOUND IT! Field name: ' + key + ' = ' + company[key]);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findCategoryField();