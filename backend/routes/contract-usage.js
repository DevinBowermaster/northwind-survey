const express = require('express');
const router = express.Router();
const db = require('../../database');
const { getLastThreeMonths } = require('../../backend/sync-contract-health');

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
 * - discount_amount (REAL) - Block Hours discount from DISCOUNT contract
 * - effective_hourly_rate (REAL) - Block Hours rate after discount
 * - block_hourly_rate (REAL) - Block Hours contract hourly rate
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
    
    // Get contract usage data for this client (last 3 months, newest first)
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
        overage_amount,
        discount_amount,
        effective_hourly_rate,
        block_hourly_rate
      FROM contract_usage
      WHERE client_id = ?
      ORDER BY month DESC
      LIMIT 3
    `).all(clientId);
    
    if (usageData.length === 0) {
      // No usage data found, return basic client info
      return res.json({
        clientId: client.id,
        clientName: client.name,
        client: client.name,
        contractType: null,
        monthlyHours: null,
        monthlyRevenue: null,
        currentMonth: null,
        months: []
      });
    }
    
    // Get contract type, monthly hours, and unlimited contract amount (monthly_revenue) from first record
    const firstRecord = usageData[0];
    const contractType = firstRecord.contract_type;
    const monthlyHours = firstRecord.monthly_hours != null ? Number(firstRecord.monthly_hours) : null;
    const monthlyRevenue = firstRecord.monthly_revenue != null ? Number(firstRecord.monthly_revenue) : null;
    
    // Current month (latest) object for detail view
    const currentMonth = {
      month: firstRecord.month,
      allocated: firstRecord.monthly_hours != null ? Number(firstRecord.monthly_hours) : null,
      used: firstRecord.hours_used != null ? Number(firstRecord.hours_used) : 0,
      remaining: firstRecord.hours_remaining !== null ? Number(firstRecord.hours_remaining) : null,
      percentage: firstRecord.percentage_used !== null ? Math.round(Number(firstRecord.percentage_used)) : null,
      overageAmount: firstRecord.overage_amount != null ? Number(firstRecord.overage_amount) : null,
      monthlyRevenue: firstRecord.monthly_revenue != null ? Number(firstRecord.monthly_revenue) : null,
      discountAmount: firstRecord.discount_amount != null ? Number(firstRecord.discount_amount) : null,
      effectiveHourlyRate: firstRecord.effective_hourly_rate != null ? Number(firstRecord.effective_hourly_rate) : null,
      blockHourlyRate: firstRecord.block_hourly_rate != null ? Number(firstRecord.block_hourly_rate) : null
    };
    
    // Format months array
    const months = usageData.map(record => {
      const revenue = record.monthly_revenue != null ? Number(record.monthly_revenue) : null;
      const overageAmount = record.overage_amount != null ? Number(record.overage_amount) : null;
      const discountAmount = record.discount_amount != null ? Number(record.discount_amount) : null;
      const effectiveHourlyRate = record.effective_hourly_rate != null ? Number(record.effective_hourly_rate) : null;
      const blockHourlyRate = record.block_hourly_rate != null ? Number(record.block_hourly_rate) : null;
      // For Unlimited contracts, return null for block-specific fields
      if (contractType === 'Unlimited') {
        return {
          month: record.month,
          allocated: null,
          used: record.hours_used || 0,
          remaining: null,
          percentage: null,
          cost: record.total_cost || 0,
          monthlyRevenue: revenue,
          overageAmount: null,
          discountAmount: null,
          effectiveHourlyRate: null,
          blockHourlyRate: null
        };
      }
      // For Block Hours contracts, return all values including discount and rates
      return {
        month: record.month,
        allocated: record.monthly_hours || null,
        used: record.hours_used || 0,
        remaining: record.hours_remaining !== null ? record.hours_remaining : null,
        percentage: record.percentage_used !== null ? Math.round(record.percentage_used) : null,
        cost: record.total_cost || 0,
        monthlyRevenue: null,
        overageAmount: overageAmount,
        discountAmount: discountAmount,
        effectiveHourlyRate: effectiveHourlyRate,
        blockHourlyRate: blockHourlyRate
      };
    });
    
    // Return formatted response
    res.json({
      clientId: client.id,
      clientName: firstRecord.client_name || client.name,
      client: client.name,
      contractType: contractType,
      monthlyHours: monthlyHours,
      monthlyRevenue: monthlyRevenue,
      currentMonth: currentMonth,
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
    // Use same "current month" as sync (first of last three months) so we always read the month we wrote
    const months = getLastThreeMonths();
    const currentMonth = months[0];
    
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
        cu.monthly_revenue as monthly_revenue,
        cu.overage_amount as overage_amount,
        cu.discount_amount as discount_amount,
        cu.effective_hourly_rate as effective_hourly_rate,
        cu.block_hourly_rate as block_hourly_rate
      FROM clients c
      LEFT JOIN contract_usage cu ON c.id = cu.client_id AND cu.month = ?
      WHERE c.company_type = 'managed' AND c.autotask_id IS NOT NULL
      ORDER BY cu.client_name ASC
    `).all(currentMonth);
    
    // Format response array - include unlimited contract amount (monthly_revenue) for Unlimited contracts
    const result = clients
      .filter(client => client.clientName) // Only include clients with contract usage data
      .map(client => {
        const isUnlimited = client.contractType === 'Unlimited';
        const unlimitedAmount = client.monthly_revenue != null ? Number(client.monthly_revenue) : null;
        
        return {
          clientId: client.clientId,
          clientName: client.clientName,
          contractType: client.contractType || null,
          monthlyHours: isUnlimited ? null : (client.monthlyHours != null ? Number(client.monthlyHours) : null),
          monthlyRevenue: isUnlimited ? unlimitedAmount : null,
          currentMonth: {
            month: client.month || currentMonth,
            allocated: isUnlimited ? null : (client.monthlyHours != null ? Number(client.monthlyHours) : null),
            used: client.hours_used != null ? Number(client.hours_used) : 0,
            remaining: isUnlimited ? null : (client.hours_remaining !== null ? Number(client.hours_remaining) : null),
            percentage: isUnlimited ? null : (client.percentage_used !== null ? Math.round(Number(client.percentage_used)) : null),
            cost: client.total_cost != null ? Number(client.total_cost) : 0,
            overageAmount: isUnlimited ? null : (client.overage_amount != null ? Number(client.overage_amount) : null),
            discountAmount: isUnlimited ? null : (client.discount_amount != null ? Number(client.discount_amount) : null),
            effectiveHourlyRate: isUnlimited ? null : (client.effective_hourly_rate != null ? Number(client.effective_hourly_rate) : null),
            blockHourlyRate: isUnlimited ? null : (client.block_hourly_rate != null ? Number(client.block_hourly_rate) : null)
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
