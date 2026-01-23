const { autotaskAPI } = require('./autotask');

async function findPattern() {
  try {
    console.log('Getting sample company data to find patterns...');
    console.log('');
    
    // Get 50 companies to analyze
    const response = await autotaskAPI.get('/Companies/query?search={"filter":[{"op":"exist","field":"id"}],"MaxRecords":50}');
    const companies = response.data.items;
    
    console.log('Analyzing ' + companies.length + ' companies...');
    console.log('');
    console.log('='.repeat(80));
    
    // Group companies by classification
    const byClassification = {};
    const byCompanyType = {};
    const byMarketSegment = {};
    
    companies.forEach(function(company) {
      // By classification
      const classId = company.classification || 'none';
      if (!byClassification[classId]) {
        byClassification[classId] = [];
      }
      byClassification[classId].push(company.companyName);
      
      // By company type
      const typeId = company.companyType || 'none';
      if (!byCompanyType[typeId]) {
        byCompanyType[typeId] = [];
      }
      byCompanyType[typeId].push(company.companyName);
      
      // By market segment
      const segmentId = company.marketSegmentID || 'none';
      if (!byMarketSegment[segmentId]) {
        byMarketSegment[segmentId] = [];
      }
      byMarketSegment[segmentId].push(company.companyName);
    });
    
    console.log('COMPANIES GROUPED BY CLASSIFICATION:');
    console.log('');
    Object.keys(byClassification).forEach(function(key) {
      console.log('Classification ID ' + key + ': ' + byClassification[key].length + ' companies');
      byClassification[key].slice(0, 5).forEach(function(name) {
        console.log('  - ' + name);
      });
      if (byClassification[key].length > 5) {
        console.log('  ... and ' + (byClassification[key].length - 5) + ' more');
      }
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log('');
    console.log('COMPANIES GROUPED BY COMPANY TYPE:');
    console.log('');
    Object.keys(byCompanyType).forEach(function(key) {
      const typeNames = {
        '1': 'Customer',
        '2': 'Lead',
        '3': 'Prospect',
        '4': 'Dead',
        '6': 'Cancellation',
        '7': 'Vendor',
        '8': 'Partner'
      };
      console.log('Type ' + key + ' (' + (typeNames[key] || 'Unknown') + '): ' + byCompanyType[key].length + ' companies');
      byCompanyType[key].slice(0, 5).forEach(function(name) {
        console.log('  - ' + name);
      });
      if (byCompanyType[key].length > 5) {
        console.log('  ... and ' + (byCompanyType[key].length - 5) + ' more');
      }
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log('');
    console.log('DETAILED VIEW - First 10 Companies:');
    console.log('');
    
    companies.slice(0, 10).forEach(function(company, index) {
      console.log((index + 1) + '. ' + company.companyName);
      console.log('   ID: ' + company.id);
      console.log('   Company Type: ' + company.companyType + ' (1=Customer, 2=Lead, 3=Prospect)');
      console.log('   Classification: ' + (company.classification || 'none'));
      console.log('   Active: ' + company.isActive);
      console.log('   Territory: ' + (company.territoryID || 'none'));
      console.log('   Market Segment: ' + (company.marketSegmentID || 'none'));
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log('');
    console.log('HELP ME IDENTIFY YOUR MANAGED CLIENTS:');
    console.log('Look at the company names above.');
    console.log('Can you recognize which ones are your managed clients?');
    console.log('What do they have in common?');
    console.log('  - Same Classification ID?');
    console.log('  - Same Company Type?');
    console.log('  - Same Territory?');
    console.log('  - Are they all "Active"?');
    console.log('  - Something else?');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findPattern();