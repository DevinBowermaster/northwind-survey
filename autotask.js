const axios = require('axios');

// Autotask Configuration
const AUTOTASK_CONFIG = {
  baseURL: 'https://webservices15.autotask.net/atservicesrest',
  username: 'du2v2c35bs3ucjl@northwind.us',
  apiKey: 'rQ#3D*5y@jX6P$1i8Yw~Bm*9b',
  integrationCode: 'DUROCZHIJMWB4FH4VH2FQ4VKSKY'
};

// Create Axios instance with auth
const autotaskAPI = axios.create({
  baseURL: AUTOTASK_CONFIG.baseURL + '/v1.0',
  headers: {
    'ApiIntegrationcode': AUTOTASK_CONFIG.integrationCode,
    'UserName': AUTOTASK_CONFIG.username,
    'Secret': AUTOTASK_CONFIG.apiKey,
    'Content-Type': 'application/json'
  }
});

// Test connection
async function testConnection() {
  try {
    const response = await autotaskAPI.get('/Companies/query?search={"filter":[{"op":"exist","field":"id"}]}');
    console.log('Autotask connection successful!');
    console.log('Found ' + response.data.items.length + ' companies');
    return true;
  } catch (error) {
    console.error('Autotask connection failed:', error.response?.data || error.message);
    return false;
  }
}

// Get all companies with pagination
async function getAllCompanies() {
  try {
    console.log('Fetching companies from Autotask...');
    
    let allCompanies = [];
    let pageSize = 500;
    let hasMore = true;
    
    while (hasMore) {
      const params = {
        search: JSON.stringify({
          filter: [{ op: 'exist', field: 'id' }],
          MaxRecords: pageSize
        })
      };
      
      // Add pagination if we have companies already
      if (allCompanies.length > 0) {
        const lastCompanyId = allCompanies[allCompanies.length - 1].id;
        params.search = JSON.stringify({
          filter: [
            { op: 'exist', field: 'id' },
            { op: 'gt', field: 'id', value: lastCompanyId }
          ],
          MaxRecords: pageSize
        });
      }
      
      const response = await autotaskAPI.get('/Companies/query', { params });
      const companies = response.data.items;
      
      console.log(`Fetched ${companies.length} companies (total: ${allCompanies.length + companies.length})`);
      
      allCompanies = allCompanies.concat(companies);
      
      // If we got fewer than pageSize, we're done
      if (companies.length < pageSize) {
        hasMore = false;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Total companies fetched: ${allCompanies.length}`);
    return allCompanies;
  } catch (error) {
    console.error('Error fetching companies:', error.response?.data || error.message);
    throw error;
  }
}
// Query contacts with pagination
async function queryContacts(page = 1, pageSize = 500, lastContactId = null) {
  try {
    const filter = [{ op: 'exist', field: 'id' }];
    
    // Add pagination filter if we have a lastContactId
    if (lastContactId) {
      filter.push({ op: 'gt', field: 'id', value: lastContactId });
    }
    
    const params = {
      search: JSON.stringify({
        filter: filter,
        MaxRecords: pageSize
      })
    };
    
    const response = await autotaskAPI.get('/Contacts/query', { params });
    return response.data;
  } catch (error) {
    console.error('Error querying contacts:', error.response?.data || error.message);
    throw error;
  }
}

// Get a specific company by ID
async function getCompany(companyId) {
  try {
    const response = await autotaskAPI.get('/Companies/' + companyId);
    return response.data.item;
  } catch (error) {
    console.error('Error fetching company:', error.response?.data || error.message);
    throw error;
  }
}

// Create a ticket
async function createTicket(ticketData) {
  try {
    const response = await autotaskAPI.post('/Tickets', ticketData);
    console.log('Ticket created:', response.data.itemId);
    return response.data.item;
  } catch (error) {
    console.error('Error creating ticket:', error.response?.data || error.message);
    throw error;
  }
}

// Get ticket statuses
async function getTicketStatuses() {
  try {
    const response = await autotaskAPI.get('/Tickets/entityInformation/fields');
    const statusField = response.data.fields.find(function(f) { return f.name === 'status'; });
    return statusField.picklistValues;
  } catch (error) {
    console.error('Error fetching ticket statuses:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  testConnection,
  getAllCompanies,
  getCompany,
  createTicket,
  getTicketStatuses,
  queryContacts,
  autotaskAPI
};