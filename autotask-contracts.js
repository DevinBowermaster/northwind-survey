const { autotaskAPI } = require('./autotask');

/**
 * Autotask Contracts API Functions
 * 
 * Functions to query contract data, contract blocks, and time entries
 * from the Autotask API for contract usage tracking.
 */

/**
 * Get the active contract for a company
 * @param {number} companyId - Autotask company ID
 * @returns {Promise<Object|null>} Active contract with id, contractType, contractCategory, or null if none
 */
async function getClientContract(companyId) {
  try {
    console.log(`[getClientContract] Fetching active contract for company ID: ${companyId}`);
    
    const params = {
      search: JSON.stringify({
        filter: [
          { op: 'eq', field: 'companyID', value: companyId },
          { op: 'eq', field: 'status', value: 'Active' }
        ]
      })
    };
    
    const response = await autotaskAPI.get('/Contracts/query', { params });
    const contracts = response.data.items || [];
    
    if (contracts.length === 0) {
      console.log(`[getClientContract] No active contract found for company ID: ${companyId}`);
      return null;
    }
    
    // Return the first active contract
    const contract = contracts[0];
    const result = {
      id: contract.id,
      contractType: contract.contractType,
      contractCategory: contract.contractCategory
    };
    
    console.log(`[getClientContract] Found active contract ID: ${contract.id}, Type: ${contract.contractType}`);
    return result;
    
  } catch (error) {
    console.error(`[getClientContract] Error fetching contract for company ID ${companyId}:`, 
      error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get contract blocks for a contract (to determine monthly allocation)
 * @param {number} contractId - Autotask contract ID
 * @returns {Promise<Object|null>} Most recent active block with hoursPurchased, or null if unlimited
 */
async function getContractBlocks(contractId) {
  try {
    console.log(`[getContractBlocks] Fetching blocks for contract ID: ${contractId}`);
    
    const params = {
      search: JSON.stringify({
        filter: [
          { op: 'eq', field: 'contractID', value: contractId }
        ],
        sort: [{ field: 'id', direction: 'DESC' }]
      })
    };
    
    const response = await autotaskAPI.get('/ContractBlocks/query', { params });
    const blocks = response.data.items || [];
    
    if (blocks.length === 0) {
      console.log(`[getContractBlocks] No blocks found for contract ID: ${contractId} (unlimited contract)`);
      return null;
    }
    
    // Get the most recent active block
    const activeBlocks = blocks.filter(block => block.isActive === true || block.isActive === 1);
    
    if (activeBlocks.length === 0) {
      console.log(`[getContractBlocks] No active blocks found for contract ID: ${contractId}`);
      return null;
    }
    
    // Return the most recent active block (already sorted by ID DESC)
    const block = activeBlocks[0];
    const result = {
      hoursPurchased: block.hoursPurchased || block.hours || null
    };
    
    console.log(`[getContractBlocks] Found active block with ${result.hoursPurchased} hours purchased`);
    return result;
    
  } catch (error) {
    console.error(`[getContractBlocks] Error fetching blocks for contract ID ${contractId}:`, 
      error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get monthly time entries for a contract
 * @param {number} contractId - Autotask contract ID
 * @param {number} year - Year (e.g., 2024, 2025)
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object>} Object with totalHours and totalCost
 */
async function getMonthlyTimeEntries(contractId, year, month) {
  try {
    console.log(`[getMonthlyTimeEntries] Fetching time entries for contract ID: ${contractId}, ${year}-${month}`);
    
    // Calculate start and end of month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    // Format dates as YYYY-MM-DD for Autotask API
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`[getMonthlyTimeEntries] Date range: ${startDateStr} to ${endDateStr}`);
    
    const params = {
      search: JSON.stringify({
        filter: [
          { op: 'eq', field: 'contractID', value: contractId },
          { op: 'gte', field: 'dateWorked', value: startDateStr },
          { op: 'lte', field: 'dateWorked', value: endDateStr },
          { op: 'eq', field: 'billableType', value: 'Billable' }
        ]
      })
    };
    
    const response = await autotaskAPI.get('/TimeEntries/query', { params });
    const timeEntries = response.data.items || [];
    
    console.log(`[getMonthlyTimeEntries] Found ${timeEntries.length} billable time entries`);
    
    // Calculate total hours and cost
    let totalHours = 0;
    let totalCost = 0;
    
    timeEntries.forEach(entry => {
      const hours = parseFloat(entry.hoursWorked || entry.hours || 0);
      const hourlyRate = parseFloat(entry.hourlyRate || entry.rate || 0);
      
      totalHours += hours;
      totalCost += hours * hourlyRate;
    });
    
    const result = {
      totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
      totalCost: Math.round(totalCost * 100) / 100
    };
    
    console.log(`[getMonthlyTimeEntries] Total: ${result.totalHours} hours, $${result.totalCost.toFixed(2)} cost`);
    return result;
    
  } catch (error) {
    console.error(`[getMonthlyTimeEntries] Error fetching time entries for contract ID ${contractId}:`, 
      error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  getClientContract,
  getContractBlocks,
  getMonthlyTimeEntries
};
