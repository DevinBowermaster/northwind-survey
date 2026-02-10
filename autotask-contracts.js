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
    
    // Filter to active contracts (status = 1)
    const activeContracts = allContracts.filter(c => c.status === 1);
    
    if (activeContracts.length === 0) {
      console.log(`[getClientContract] No active contract found for company ID: ${companyId}`);
      return null;
    }
    
    // ALWAYS prefer category 12 (Managed Service Unlimited) over others (e.g. SaaS category 16)
    const category12 = activeContracts.find(c => c.contractCategory === 12);
    const contract = category12 || activeContracts[0];
    
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
    let blockHourlyRate = null;

    // Category 12 = Managed Service. Always display as Unlimited.
    // Special case: some category 12 contracts are Type 4 (Block Hours billing) like COLLIERS/WESTWATER.
    if (contractCategory === 12) {
      displayType = 'Unlimited';
      isUnlimited = true;
      console.log(`[getClientContract] Managed Service (category 12) contract`);

      if (contractType === 4) {
        // Category 12 + Type 4: display as Unlimited but use Block Hours-style allocation and rate.
        console.log('[getClientContract] Category 12 + Type 4 (Unlimited display, Block Hours billing)');
        try {
          blocks = await getContractBlocks(contract.id);
          if (blocks && blocks.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const currentBlock = blocks.find(block => {
              if (!block.startDate || !block.endDate) return false;
              const startDate = new Date(block.startDate);
              const endDate = new Date(block.endDate);
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(23, 59, 59, 999);
              return today >= startDate && today <= endDate;
            });

            const chosenBlock = currentBlock || blocks[0];
            if (chosenBlock && chosenBlock.hours) {
              monthlyAllocation = chosenBlock.hours;
              blockHourlyRate = chosenBlock.hourlyRate != null ? chosenBlock.hourlyRate : null;
              console.log(`[getClientContract] Using block hours for category 12 Type 4: ${monthlyAllocation} hours at rate ${blockHourlyRate}`);
            } else {
              console.warn('[getClientContract] Category 12 Type 4: blocks found but no hours; falling back to estimatedHours');
              monthlyAllocation = contract.estimatedHours || null;
            }
          } else {
            monthlyAllocation = contract.estimatedHours || null;
            console.log('[getClientContract] Category 12 Type 4: no blocks, using estimatedHours:', monthlyAllocation);
          }
        } catch (error) {
          console.warn('[getClientContract] Category 12 Type 4: error fetching blocks, using estimatedHours:', error.message);
          monthlyAllocation = contract.estimatedHours || null;
        }
      } else {
        // Type 7 = true Unlimited; no block allocation
        monthlyAllocation = null;
      }
    } else if (contractType === 4 && contractCategory === 13) {
      // Type 4, Category 13 = regular Block Hours
      displayType = 'Block Hours';
      console.log(`[getClientContract] Identified as Block Hours contract`);

      try {
        blocks = await getContractBlocks(contract.id);
        if (blocks && blocks.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const currentBlock = blocks.find(block => {
            if (!block.startDate || !block.endDate) return false;
            const startDate = new Date(block.startDate);
            const endDate = new Date(block.endDate);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            return today >= startDate && today <= endDate;
          });

          const chosenBlock = currentBlock || blocks[0];
          if (chosenBlock && chosenBlock.hours) {
            monthlyAllocation = chosenBlock.hours;
            blockHourlyRate = chosenBlock.hourlyRate != null ? chosenBlock.hourlyRate : null;
            console.log(`[getClientContract] Monthly allocation from block: ${monthlyAllocation} hours at rate ${blockHourlyRate}`);
          } else {
            console.warn('[getClientContract] Blocks found but none have hours; falling back to estimatedHours');
            monthlyAllocation = contract.estimatedHours || null;
          }
        } else {
          monthlyAllocation = contract.estimatedHours || null;
          console.log('[getClientContract] No blocks found, using estimatedHours:', monthlyAllocation);
        }
      } catch (error) {
        console.warn('[getClientContract] Error fetching blocks, using estimatedHours:', error.message);
        monthlyAllocation = contract.estimatedHours || null;
      }
    } else if (contractType === 7) {
      // Other Unlimited contracts (non-category-12) - treat as Unlimited display with no allocation
      monthlyAllocation = null;
      displayType = 'Unlimited';
      isUnlimited = true;
      console.log('[getClientContract] Identified as Unlimited contract (type 7)');
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
      monthlyAllocation: monthlyAllocation, // Hours for Block Hours, or for category 12 Type 4 pseudo-blocks
      blockHourlyRate: blockHourlyRate,
      isUnlimited: isUnlimited,
      estimatedHours: contract.estimatedHours, // Keep raw value for reference
      estimatedRevenue: contract.estimatedRevenue != null ? parseFloat(contract.estimatedRevenue) : null,
      startDate: contract.startDate || null,
      endDate: contract.endDate || null,
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
    
    // Sort by endDate descending to get most recent first (by date, not ID)
    blocks.sort((a, b) => {
      const dateA = a.endDate ? new Date(a.endDate) : new Date(0);
      const dateB = b.endDate ? new Date(b.endDate) : new Date(0);
      return dateB - dateA; // Most recent end date first
    });
    
    console.log(`[getContractBlocks] Found ${blocks.length} blocks for contract ID: ${contractId}`);
    
    // Return all blocks with full fields (hourlyRate used for Block Hours monthly revenue calc)
    const result = blocks.map(block => ({
      id: block.id,
      contractID: block.contractID,
      hours: block.hoursPurchased || block.hours || null, // Prefer hoursPurchased (matches UI)
      hoursApproved: block.hoursApproved || null,
      startDate: block.startDate || null,
      endDate: block.endDate || null,
      status: block.status || null,
      isActive: block.isActive || null,
      hourlyRate: block.hourlyRate != null ? parseFloat(block.hourlyRate) : (block.unitPrice != null ? parseFloat(block.unitPrice) : null),
      raw: block
    }));
    
    // Log the most recent block details
    if (result.length > 0) {
      const mostRecent = result[0];
      console.log(`[getContractBlocks] Most recent block (by endDate): ID ${mostRecent.id}, Hours: ${mostRecent.hours}, Start: ${mostRecent.startDate}, End: ${mostRecent.endDate}`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`[getContractBlocks] Error fetching blocks for contract ID ${contractId}:`, 
      error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get contract services for a contract (e.g. recurring monthly services)
 * @param {number} contractId - Autotask contract ID
 * @param {{ logRaw?: boolean }} options - If logRaw is true, log full raw API objects for debugging
 * @returns {Promise<Array>} Array of services with mapped fields + raw (all API fields)
 *
 * NOTE: We intentionally do NOT use IncludeFields here. Let the API return
 * all available fields so we can see exactly what exists (units, extendedPrice, etc).
 */
async function getContractServices(contractId, options = {}) {
  try {
    console.log(`[getContractServices] Fetching services for contract ID: ${contractId}`);

    const searchFilter = {
      filter: [
        { op: 'eq', field: 'contractID', value: contractId }
      ]
    };

    const params = {
      search: JSON.stringify(searchFilter)
    };

    const response = await autotaskAPI.get('/ContractServices/query', { params });
    const items = response.data.items || [];

    const result = items.map(svc => {
      const unitPrice = svc.unitPrice != null ? parseFloat(svc.unitPrice) : null;
      const adjustedPrice = svc.adjustedPrice != null ? parseFloat(svc.adjustedPrice) : null;
      const adjustedUnitPrice = svc.adjustedUnitPrice != null ? parseFloat(svc.adjustedUnitPrice) : null;
      const units = svc.units != null ? parseFloat(svc.units) : null;
      const extendedPrice = svc.extendedPrice != null ? parseFloat(svc.extendedPrice) : null;
      const internalCurrencyUnitPrice = svc.internalCurrencyUnitPrice != null ? parseFloat(svc.internalCurrencyUnitPrice) : null;
      const internalCurrencyAdjustedPrice = svc.internalCurrencyAdjustedPrice != null ? parseFloat(svc.internalCurrencyAdjustedPrice) : null;
      return {
        serviceName: svc.serviceName || svc.name || null,
        periodType: svc.periodType || svc.billingCycle || null,
        unitPrice,
        adjustedPrice,
        adjustedUnitPrice,
        units: units != null ? units : 1,
        extendedPrice,
        allocationCodeID: svc.allocationCodeID != null ? svc.allocationCodeID : (svc.allocationCodeId != null ? svc.allocationCodeId : null),
        internalCurrencyUnitPrice,
        internalCurrencyAdjustedPrice,
        description: svc.description || svc.internalDescription || null,
        raw: svc
      };
    });

    console.log(`[getContractServices] Found ${result.length} services for contract ID: ${contractId}`);

    if (options.logRaw && items.length > 0) {
      console.log('[getContractServices] --- RAW ContractServices API response (all fields) ---');
      items.forEach((svc, idx) => {
        console.log(`[getContractServices] Service ${idx + 1}/${items.length}:`, JSON.stringify(svc, null, 2));
      });
      console.log('[getContractServices] --- END RAW ---');
    }

    return result;
  } catch (error) {
    console.error(`[getContractServices] Error fetching services for contract ID ${contractId}:`,
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

/**
 * Get ContractServiceUnits for a contract for a specific period (as-of date).
 * This returns the units whose startDate <= asOfDate <= endDate and sums their price.
 * This matches the \"Extended Price\" per service and the \"Estimated Monthly Price\" total in the UI.
 *
 * @param {number} contractId - Autotask contract ID
 * @param {Date} [asOfDate=new Date()] - Date that must fall within the unit period
 * @returns {Promise<{ services: Array, totalMonthlyRevenue: number }>}
 */
async function getContractServiceUnits(contractId, asOfDate = new Date()) {
  try {
    const search = {
      filter: [
        { op: 'eq', field: 'contractID', value: contractId }
      ]
    };

    const params = { search: JSON.stringify(search) };
    const response = await autotaskAPI.get('/ContractServiceUnits/query', { params });
    const units = response.data.items || [];

    const asOf = new Date(asOfDate);

    const currentPeriodUnits = units.filter((unit) => {
      if (!unit.startDate || !unit.endDate) return false;
      const start = new Date(unit.startDate);
      const end = new Date(unit.endDate);
      return asOf >= start && asOf <= end;
    });

    const totalMonthlyRevenue = currentPeriodUnits.reduce((sum, unit) => {
      const p = unit.price != null ? parseFloat(unit.price) : 0;
      return sum + p;
    }, 0);

    return {
      services: currentPeriodUnits,
      totalMonthlyRevenue: Math.round(totalMonthlyRevenue * 100) / 100
    };
  } catch (error) {
    console.error(`[getContractServiceUnits] Error for contract ID ${contractId}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get discount contract for a company (contract name containing "DISCOUNT").
 * Used for Block Hours effective hourly rate: (hours × rate - discount) / hours.
 * @param {number} companyId - Autotask company ID
 * @returns {Promise<{ discountContractId?: number, discountAmount: number }>}
 */
async function getDiscountContract(companyId) {
  try {
    const search = {
      filter: [
        { op: 'eq', field: 'companyID', value: companyId }
      ]
    };

    const response = await autotaskAPI.get('/Contracts/query', {
      params: { search: JSON.stringify(search) }
    });

    const contracts = response.data.items || [];
    const discountContract = contracts.find(
      (c) => c.contractName && c.contractName.toUpperCase().includes('DISCOUNT') && c.status === 1
    );

    if (!discountContract) {
      return { discountAmount: 0 };
    }

    const unitsResult = await getContractServiceUnits(discountContract.id, new Date());
    const discountAmount = Math.abs(unitsResult.totalMonthlyRevenue || 0);

    return {
      discountContractId: discountContract.id,
      discountAmount: Math.round(discountAmount * 100) / 100
    };
  } catch (error) {
    console.error(`[getDiscountContract] Error for company ${companyId}:`, error.message);
    return { discountAmount: 0 };
  }
}

module.exports = {
  getClientContract,
  getContractBlocks,
  getContractServices,
  getContractServiceUnits,
  getMonthlyTimeEntries,
  getDiscountContract
};
