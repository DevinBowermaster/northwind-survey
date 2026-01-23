const { autotaskAPI } = require('./autotask');

async function discoverFields() {
  try {
    console.log('Discovering all Company fields in Autotask...');
    
    const response = await autotaskAPI.get('/Companies/entityInformation/fields');
    const fields = response.data.fields;
    
    console.log('Found ' + fields.length + ' total fields');
    console.log('');
    
    fields.forEach(function(field, index) {
      const num = index + 1;
      console.log(num + '. ' + field.name + ' - ' + field.label);
      
      if (field.picklistValues && field.picklistValues.length > 0) {
        console.log('   Options:');
        field.picklistValues.forEach(function(val) {
          console.log('   - ' + val.label + ' (ID: ' + val.value + ')');
        });
      }
      
      if (field.isUDF) {
        console.log('   [User Defined Field]');
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response && error.response.data) {
      console.error('Details:', error.response.data);
    }
  }
}

discoverFields();