const express = require('express');
const router = express.Router();
const db = require('../../database');

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
    
    // Get contract usage data for this client
    const usageData = db.prepare(`
      SELECT 
        client_name,
        contract_type,
        monthly_hours,
        month,
        hours_used,
        hours_remaining,
        percentage_used
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
        months: []
      });
    }
    
    // Get contract type and monthly hours from first record (all should be same)
    const firstRecord = usageData[0];
    const contractType = firstRecord.contract_type;
    const monthlyHours = firstRecord.monthly_hours;
    
    // Format months array
    const months = usageData.map(record => {
      // For Unlimited contracts, return null for allocated, remaining, and percentage
      if (contractType === 'Unlimited') {
        return {
          month: record.month,
          allocated: null,
          used: record.hours_used || 0,
          remaining: null,
          percentage: null
        };
      }
      
      // For Block Hours contracts, return all values
      return {
        month: record.month,
        allocated: record.monthly_hours || null,
        used: record.hours_used || 0,
        remaining: record.hours_remaining !== null ? record.hours_remaining : null,
        percentage: record.percentage_used !== null ? Math.round(record.percentage_used) : null
      };
    });
    
    // Return formatted response
    res.json({
      client: client.name,
      contractType: contractType,
      monthlyHours: monthlyHours,
      months: months
    });
    
  } catch (error) {
    console.error('Error fetching contract usage:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = router;
