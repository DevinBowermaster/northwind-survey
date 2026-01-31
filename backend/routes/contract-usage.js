const express = require('express');
const router = express.Router();
const db = require('../../database');

/**
 * Contract Usage API Routes
 * 
 * Table: contract_usage
 * Columns:
 * - id (PRIMARY KEY)
 * - client_id (INTEGER, FK to clients.id)
 * - client_name (TEXT)
 * - autotask_company_id (INTEGER) - NOTE: NOT "company_id"
 * - contract_id (INTEGER)
 * - contract_type (TEXT)
 * - month (TEXT, format: YYYY-MM)
 * - monthly_hours (REAL)
 * - hours_used (REAL)
 * - hours_remaining (REAL)
 * - percentage_used (REAL)
 * - total_cost (REAL)
 * - monthly_revenue (REAL) - Unlimited estimated monthly revenue only
 * - overage_amount (REAL) - Block Hours overage charge when hours_used > monthly_hours
 * - synced_at (TEXT)
 */

/**
 * GET /contract-usage
 * 
 * Query parameters:
 * - clientId (required): The database client ID
 * 
 * Returns contract usage data for the specified client
 */
router.get('/contract-usage', (req, res) => {
  try {
    const clientId = req.query.clientId;
    
    // Validate clientId parameter
    if (!clientId) {
      return res.status(400).json({ error: 'clientId query parameter is required' });
    }
    
    // Check if client exists
    const client = db.prepare(`
      SELECT id, name, autotask_id
      FROM clients
      WHERE id = ?
    `).get(clientId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Get contract usage data for this client (all recorded months, newest first)
    const usageData = db.prepare(`
      SELECT 
        client_name,
        contract_type,
        monthly_hours,
        month,
        hours_used,
        hours_remaining,
        percentage_used,
        total_cost,
        monthly_revenue,
        overage_amount
      FROM contract_usage
      WHERE client_id = ?
      ORDER BY month DESC
    `).all(clientId);
    
    if (usageData.length === 0) {
      // No usage data found, return basic client info
      return res.json({
        client: client.name,
        contractType: null,
        monthlyHours: null,
        monthlyRevenue: null,
        months: []
      });
    }
    
    // Get contract type, monthly hours, and monthly revenue from first record (all should be same per client)
    const firstRecord = usageData[0];
    const contractType = firstRecord.contract_type;
    const monthlyHours = firstRecord.monthly_hours;
    const monthlyRevenue = firstRecord.monthly_revenue != null ? firstRecord.monthly_revenue : null;
    
    // Format months array
    const months = usageData.map(record => {
      const revenue = record.monthly_revenue != null ? record.monthly_revenue : null;
      const overageAmount = record.overage_amount != null ? record.overage_amount : null;
      // For Unlimited contracts, return null for allocated, remaining, percentage, overage
      if (contractType === 'Unlimited') {
        return {
          month: record.month,
          allocated: null,
          used: record.hours_used || 0,
          remaining: null,
          percentage: null,
          cost: record.total_cost || 0,
          monthlyRevenue: revenue,
          overageAmount: null
        };
      }
      
      // For Block Hours contracts, return all values including overage when present
      return {
        month: record.month,
        allocated: record.monthly_hours || null,
        used: record.hours_used || 0,
        remaining: record.hours_remaining !== null ? record.hours_remaining : null,
        percentage: record.percentage_used !== null ? Math.round(record.percentage_used) : null,
        cost: record.total_cost || 0,
        monthlyRevenue: null,
        overageAmount: overageAmount
      };
    });
    
    // Return formatted response
    res.json({
      client: client.name,
      contractType: contractType,
      monthlyHours: monthlyHours,
      monthlyRevenue: monthlyRevenue,
      months: months
    });
    
  } catch (error) {
    console.error('Error fetching contract usage:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * GET /contract-usage/all
 * 
 * Returns contract usage data for all managed clients for the most recent month
 * Returns an array of client objects with current month usage
 */
router.get('/contract-usage/all', (req, res) => {
  try {
    // Get current month in YYYY-MM format (2026-01)
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Get all managed clients with their current month contract usage
    const clients = db.prepare(`
      SELECT 
        c.id as clientId,
        cu.client_name as clientName,
        cu.contract_type as contractType,
        cu.monthly_hours as monthlyHours,
        cu.month,
        cu.hours_used,
        cu.hours_remaining,
        cu.percentage_used,
        cu.total_cost,
        cu.monthly_revenue,
        cu.overage_amount
      FROM clients c
      LEFT JOIN contract_usage cu ON c.id = cu.client_id AND cu.month = ?
      WHERE c.company_type = 'managed' AND c.autotask_id IS NOT NULL
      ORDER BY cu.client_name ASC
    `).all(currentMonth);
    
    // Format response array
    const result = clients
      .filter(client => client.clientName) // Only include clients with contract usage data
      .map(client => {
        const isUnlimited = client.contractType === 'Unlimited';
        
        return {
          clientId: client.clientId,
          clientName: client.clientName,
          contractType: client.contractType || null,
          monthlyHours: isUnlimited ? null : (client.monthlyHours || null),
          monthlyRevenue: isUnlimited && client.monthly_revenue != null ? client.monthly_revenue : null,
          currentMonth: {
            month: client.month || currentMonth,
            allocated: isUnlimited ? null : (client.monthlyHours || null),
            used: client.hours_used || 0,
            remaining: isUnlimited ? null : (client.hours_remaining !== null ? client.hours_remaining : null),
            percentage: isUnlimited ? null : (client.percentage_used !== null ? Math.round(client.percentage_used) : null),
            cost: client.total_cost || 0,
            overageAmount: isUnlimited ? null : (client.overage_amount != null ? client.overage_amount : null)
          }
        };
      });
    
    res.json(result);
    
  } catch (error) {
    console.error('Error fetching all contract usage:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;
