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
    console.log(`[getClientContract] Fetching contracts for company ID: ${companyId}`);
    
    const params = {
      search: JSON.stringify({
        filter: [
          { op: 'eq', field: 'companyID', value: companyId }
        ]
      })
    };
    
    const response = await autotaskAPI.get('/Contracts/query', { params });
    const allContracts = response.data.items || [];
    
    console.log(`[getClientContract] Found ${allContracts.length} total contracts for company ID: ${companyId}`);
    
    // Filter for active contracts (status = 1 is Active, numeric ID)
    // Also filter out status that might be 'Complete' or 'Canceled' if they're strings
    const activeContracts = allContracts.filter(contract => {
      const status = contract.status;
      // Status 1 = Active (numeric)
      if (typeof status === 'number') {
        return status === 1;
      }
      // If it's a string, filter out Complete/Canceled
      if (typeof status === 'string') {
        const statusLower = status.toLowerCase();
        return statusLower !== 'complete' && statusLower !== 'canceled';
      }
      // Default: include if status exists
      return status != null;
    });
    
    if (activeContracts.length === 0) {
      console.log(`[getClientContract] No active contract found for company ID: ${companyId}`);
      return null;
    }
    
    // Return the first active contract
    const contract = activeContracts[0];
    
    // Log the FULL contract object to see all available fields
    console.log(`[getClientContract] Full contract object from API:`);
    console.log(JSON.stringify(contract, null, 2));
    
    // Determine contract type and monthly allocation
    const contractType = contract.contractType;
    const contractCategory = contract.contractCategory;
    let monthlyAllocation = null;
    let displayType = 'Unknown';
    let isUnlimited = false;
    let blocks = null;
    
    if (contractType === 4 && contractCategory === 13) {
      // Block Hours client - query blocks to get monthly allocation
      displayType = 'Block Hours';
      console.log(`[getClientContract] Identified as Block Hours contract`);
      
      try {
        blocks = await getContractBlocks(contract.id);
        if (blocks && blocks.length > 0) {
          // Find any active block and use its "hours" field
          const activeBlock = blocks.find(block => 
            block.isActive === true || 
            block.isActive === 1 || 
            block.status === 'Active' ||
            block.status === 1
          );
          
          if (activeBlock && activeBlock.hours) {
            monthlyAllocation = activeBlock.hours;
            console.log(`[getClientContract] Monthly allocation from active block: ${monthlyAllocation} hours (from block ID ${activeBlock.id})`);
          } else {
            // If no active block found, use the most recent block
            const mostRecentBlock = blocks[0];
            monthlyAllocation = mostRecentBlock.hours || null;
            console.log(`[getClientContract] No active block found, using most recent block: ${monthlyAllocation} hours (from block ID ${mostRecentBlock.id})`);
          }
        } else {
          // Fallback to estimatedHours if no blocks found
          monthlyAllocation = contract.estimatedHours || null;
          console.log(`[getClientContract] No blocks found, using estimatedHours: ${monthlyAllocation}`);
        }
      } catch (error) {
        console.warn(`[getClientContract] Error fetching blocks, using estimatedHours:`, error.message);
        monthlyAllocation = contract.estimatedHours || null;
      }
    } else if (contractType === 7 || contractCategory === 12) {
      // Unlimited client
      monthlyAllocation = null;
      displayType = 'Unlimited';
      isUnlimited = true;
      console.log(`[getClientContract] Identified as Unlimited contract`);
    } else {
      displayType = `Type ${contractType}, Category ${contractCategory}`;
      console.log(`[getClientContract] Unknown contract type combination: Type ${contractType}, Category ${contractCategory}`);
    }
    
    const result = {
      id: contract.id,
      contractType: contractType, // Numeric ID
      contractCategory: contractCategory, // Numeric ID
      status: contract.status, // Numeric ID (1 = Active)
      displayType: displayType, // "Block Hours", "Unlimited", or "Unknown"
      monthlyAllocation: monthlyAllocation, // Hours for Block Hours, null for Unlimited
      isUnlimited: isUnlimited,
      estimatedHours: contract.estimatedHours, // Keep raw value for reference
      blocks: blocks // Include blocks array for Block Hours contracts
    };
    
    console.log(`[getClientContract] Found active contract ID: ${contract.id}, Type: ${contract.contractType}, Category: ${contract.contractCategory}, Status: ${contract.status}`);
    console.log(`[getClientContract] Contract Type: ${displayType}, Monthly Allocation: ${monthlyAllocation || 'Unlimited'}`);
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
 * @returns {Promise<Array|null>} Array of all blocks with full fields, or null if no blocks
 */
async function getContractBlocks(contractId) {
  try {
    console.log(`[getContractBlocks] Fetching blocks for contract ID: ${contractId}`);
    
    const searchFilter = {
      filter: [
        { op: 'eq', field: 'contractID', value: contractId }
      ]
    };
    
    const params = {
      search: JSON.stringify(searchFilter)
    };
    
    console.log(`[getContractBlocks] Query: GET /ContractBlocks/query?search=${encodeURIComponent(JSON.stringify(searchFilter))}`);
    
    const response = await autotaskAPI.get('/ContractBlocks/query', { params });
    const blocks = response.data.items || [];
    
    if (blocks.length === 0) {
      console.log(`[getContractBlocks] No blocks found for contract ID: ${contractId} (unlimited contract)`);
      return null;
    }
    
    // Sort by ID descending to get most recent first
    blocks.sort((a, b) => (b.id || 0) - (a.id || 0));
    
    console.log(`[getContractBlocks] Found ${blocks.length} blocks for contract ID: ${contractId}`);
    
    // Return all blocks with full fields
    const result = blocks.map(block => ({
      id: block.id,
      contractID: block.contractID,
      hours: block.hours || block.hoursPurchased || null,
      hoursApproved: block.hoursApproved || null,
      startDate: block.startDate || null,
      endDate: block.endDate || null,
      status: block.status || null,
      isActive: block.isActive || null,
      // Include all other fields for reference
      raw: block
    }));
    
    // Log the most recent block details
    if (result.length > 0) {
      const mostRecent = result[0];
      console.log(`[getContractBlocks] Most recent block: ID ${mostRecent.id}, Hours: ${mostRecent.hours}, Status: ${mostRecent.status}`);
    }
    
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
    
    // Try to get billable time entries - try different field names
    let timeEntries = [];
    let allTimeEntries = [];
    
    // First, try with isBillable filter (boolean)
    try {
      const paramsWithIsBillable = {
        search: JSON.stringify({
          filter: [
            { op: 'eq', field: 'contractID', value: contractId },
            { op: 'gte', field: 'dateWorked', value: startDateStr },
            { op: 'lte', field: 'dateWorked', value: endDateStr },
            { op: 'eq', field: 'isBillable', value: true }
          ]
        })
      };
      
      const response = await autotaskAPI.get('/TimeEntries/query', { params: paramsWithIsBillable });
      allTimeEntries = response.data.items || [];
      timeEntries = allTimeEntries;
      console.log(`[getMonthlyTimeEntries] Found ${timeEntries.length} time entries with isBillable=true`);
    } catch (error) {
      console.log(`[getMonthlyTimeEntries] isBillable filter failed, trying without billable filter...`);
      
      // If that fails, try without billable filter (get all entries)
      const paramsNoBillable = {
        search: JSON.stringify({
          filter: [
            { op: 'eq', field: 'contractID', value: contractId },
            { op: 'gte', field: 'dateWorked', value: startDateStr },
            { op: 'lte', field: 'dateWorked', value: endDateStr }
          ]
        })
      };
      
      const response = await autotaskAPI.get('/TimeEntries/query', { params: paramsNoBillable });
      allTimeEntries = response.data.items || [];
      
      // Filter in JavaScript for billable entries (check isBillable field if it exists)
      timeEntries = allTimeEntries.filter(entry => {
        // If isBillable exists, use it
        if (entry.isBillable !== undefined) {
          return entry.isBillable === true || entry.isBillable === 1;
        }
        // If billingCodeType exists, check if it's billable (may need to adjust based on actual values)
        if (entry.billingCodeType !== undefined) {
          // Common billable codes are usually > 0, but we'll include all for now
          return entry.billingCodeType != null;
        }
        // If no billable field, include all entries
        return true;
      });
      
      console.log(`[getMonthlyTimeEntries] Found ${allTimeEntries.length} total time entries, ${timeEntries.length} appear to be billable`);
    }
    
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
