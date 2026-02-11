require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const db = require('./database');
const emailService = require('./email-service');
const { startScheduler } = require('./scheduler');
const contractUsageRoutes = require('./backend/routes/contract-usage');
const { migrateAddArchive } = require('./migrate-add-archive');
const { migrateContractUsage } = require('./backend/migrate-contract-usage');
const { migrateAddMonthlyRevenue } = require('./backend/migrate-add-monthly-revenue');
const { migrateAddOverageAmount } = require('./backend/migrate-add-overage-amount');
const { migrateContactsCompanyAutotaskId } = require('./backend/migrate-contacts-company-autotask-id');
const { syncContractUsage } = require('./backend/sync-contract-health');

const app = express();

app.use(cors()); 
app.use(express.json());

const PORT = 3000;

// Admin email list (can be expanded to check Okta groups)
const ADMIN_EMAILS = [
  'wylie@northwind.us',
  'devin@northwind.us'
];

// Admin check middleware
function isAdmin(req, res, next) {
  // Get user email from headers, body, or query (can be set by frontend after Okta auth)
  // Format: X-User-Email header, userEmail in body (POST), or userEmail query param (GET)
  const userEmail = req.headers['x-user-email'] || req.body?.userEmail || req.query?.userEmail;
  
  if (!userEmail) {
    return res.status(401).json({ error: 'User email required' });
  }
  
  if (!ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  // Attach user info to request for audit logging
  req.userEmail = userEmail;
  req.userName = req.headers['x-user-name'] || req.body?.userName || req.query?.userName || userEmail.split('@')[0];
  
  next();
}

// Audit logging function
function logAuditEvent(userEmail, userName, action, entityType, entityId, oldValue, newValue) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (user_email, user_name, action, entity_type, entity_id, old_value, new_value)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userEmail,
      userName || userEmail.split('@')[0],
      action,
      entityType || null,
      entityId || null,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null
    );
  } catch (error) {
    console.error('Error logging audit event:', error);
    // Don't throw - audit logging failures shouldn't break the app
  }
}

// Run idempotent migrations on startup so schema is always up to date
try {
  migrateAddArchive();
  migrateContractUsage();
  migrateAddMonthlyRevenue();
  migrateAddOverageAmount();
  migrateContactsCompanyAutotaskId();
} catch (err) {
  console.error('Error running startup migrations:', err);
}

// Start the survey scheduler
startScheduler();

// Mount route modules
app.use('/api', contractUsageRoutes);

// Home page
app.get('/', (req, res) => {
  res.send('<h1>Hello Northwind! 🚀</h1><p>Your survey system is running!</p>');
});

// Status check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'Survey system is operational',
    timestamp: new Date()
  });
});

// Get all clients
app.get('/api/clients', (req, res) => {
  try {
    const clients = db.prepare(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM contacts WHERE company_autotask_id = c.autotask_id) as contact_count,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM surveys s 
            WHERE s.client_id = c.id 
            AND s.sent_date IS NOT NULL 
            AND s.completed_date IS NULL
          ) THEN 1 
          ELSE 0 
        END as has_pending_survey
      FROM clients c
    `).all();
    
    res.json(clients);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get only managed clients
app.get('/api/clients/managed', (req, res) => {
  try {
    const clients = db.prepare(`
      SELECT * FROM clients 
      WHERE company_type = 'managed' 
      AND send_surveys = 1
      ORDER BY name
    `).all();
    res.json(clients);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch managed clients' });
  }
});

// Get clients by type
app.get('/api/clients/type/:type', (req, res) => {
  try {
    const type = req.params.type;
    const clients = db.prepare(`
      SELECT * FROM clients 
      WHERE company_type = ?
      ORDER BY name
    `).all(type);
    res.json(clients);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get all contacts for a company - MUST BE BEFORE /api/clients/:id
app.get('/api/clients/:id/contacts', (req, res) => {
  try {
    const clientId = req.params.id;
    
    const client = db.prepare('SELECT autotask_id FROM clients WHERE id = ? OR autotask_id = ?').get(clientId, clientId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const contacts = db.prepare(`
      SELECT * FROM contacts 
      WHERE company_autotask_id = ?
      ORDER BY is_primary DESC, last_name, first_name
    `).all(client.autotask_id);
    
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Set primary contact for surveys - MUST BE BEFORE /api/clients/:id
app.post('/api/clients/:id/set-primary-contact', (req, res) => {
  try {
    // Admin check
    const userEmail = req.body.userEmail || req.headers['x-user-email'];
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const userName = req.body.userName || req.headers['x-user-name'] || userEmail.split('@')[0];
    
    const clientId = req.params.id;
    const { contactId } = req.body;
    
    const client = db.prepare('SELECT * FROM clients WHERE id = ? OR autotask_id = ?').get(clientId, clientId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const contact = db.prepare('SELECT * FROM contacts WHERE autotask_id = ?').get(contactId);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    if (contact.company_autotask_id !== client.autotask_id) {
      return res.status(400).json({ error: 'Contact does not belong to this company' });
    }
    
    // Get old primary contact email for audit
    const oldEmail = client.email;
    const newEmail = contact.email;
    
    db.prepare(`
      UPDATE clients 
      SET email = ?, contact_person = ?
      WHERE autotask_id = ?
    `).run(
      contact.email,
      `${contact.first_name} ${contact.last_name}`.trim(),
      client.autotask_id
    );
    
    // Log audit event
    logAuditEvent(
      userEmail,
      userName,
      'Changed primary contact',
      'client',
      client.id,
      { email: oldEmail, contact_person: client.contact_person },
      { email: newEmail, contact_person: `${contact.first_name} ${contact.last_name}`.trim() }
    );
    
    res.json({ 
      success: true,
      message: 'Primary contact updated',
      contact: {
        name: `${contact.first_name} ${contact.last_name}`,
        email: contact.email
      }
    });
  } catch (error) {
    console.error('Error setting primary contact:', error);
    res.status(500).json({ error: 'Failed to set primary contact' });
  }
});

// Contract Health sync: run in background so the request never times out
let contractHealthSyncInProgress = false;

// Manually trigger Contract Health sync (admin only) - returns immediately, sync runs in background
app.post('/api/admin/sync-contract-health', isAdmin, (req, res) => {
  if (contractHealthSyncInProgress) {
    return res.status(200).json({
      success: true,
      started: false,
      message: 'A sync is already running. Refresh the Contract Health tab in a few minutes.'
    });
  }
  contractHealthSyncInProgress = true;
  console.log('🚀 Admin requested Contract Health sync (running in background)');
  res.status(202).json({
    success: true,
    started: true,
    message: 'Sync started. This may take a few minutes. Refresh the Contract Health tab in 2–3 minutes to see updated data.'
  });
  syncContractUsage(db)
    .then((result) => {
      const summary = result || { successCount: 0, errorCount: 0, errors: [] };
      console.log(`✅ Contract Health sync finished: ${summary.successCount} synced, ${summary.errorCount} errors`);
      if (summary.errors?.length) {
        summary.errors.forEach((e) => console.log(`   - ${e.client}: ${e.error}`));
      }
    })
    .catch((err) => console.error('Contract Health sync failed:', err))
    .finally(() => { contractHealthSyncInProgress = false; });
});

// Get a specific client by ID - MUST BE AFTER MORE SPECIFIC ROUTES
app.get('/api/clients/:id', (req, res) => {
  try {
    const clientId = req.params.id;
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json(client);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Get survey statistics by company type
app.get('/api/stats/by-type', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        company_type,
        COUNT(*) as count,
        SUM(send_surveys) as survey_enabled,
        AVG(score) as avg_score
      FROM clients
      GROUP BY company_type
    `).all();
    res.json(stats);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all contacts (for admin view)
app.get('/api/contacts', (req, res) => {
  try {
    const contacts = db.prepare('SELECT * FROM contacts ORDER BY last_name, first_name').all();
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Export managed clients primary contact emails as CSV
app.get('/api/contacts/export', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        c.name AS "Company Name",
        c.contact_person AS "Primary Contact",
        c.email AS "Primary Email",
        (SELECT co.phone FROM contacts co WHERE co.company_autotask_id = c.autotask_id AND (co.email = c.email OR (c.email IS NULL AND co.is_primary = 1)) LIMIT 1) AS "Primary Phone"
      FROM clients c
      WHERE c.company_type = 'managed'
      ORDER BY c.name
    `).all();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No managed clients found' });
    }

    const headers = Object.keys(rows[0]).join(',');
    const csvRows = rows.map((row) =>
      Object.values(row).map((val) =>
        `"${String(val ?? '').replace(/"/g, '""')}"`
      ).join(',')
    );
    const csv = [headers, ...csvRows].join('\n');

    const filename = `managed-clients-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export contacts' });
  }
});

// Get all survey templates
app.get('/api/survey-templates', (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM survey_templates ORDER BY id').all();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get single template
app.get('/api/survey-templates/:id', (req, res) => {
  try {
    const template = db.prepare('SELECT * FROM survey_templates WHERE id = ?').get(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create new template
app.post('/api/survey-templates', (req, res) => {
  try {
    const { name, type, questions, active } = req.body;
    const result = db.prepare(`
      INSERT INTO survey_templates (name, type, questions, active)
      VALUES (?, ?, ?, ?)
    `).run(name, type, questions, active ? 1 : 0);
    
    res.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: 'Template created successfully' 
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
app.put('/api/survey-templates/:id', (req, res) => {
  try {
    const { name, type, questions, active } = req.body;
    db.prepare(`
      UPDATE survey_templates 
      SET name = ?, type = ?, questions = ?, active = ?
      WHERE id = ?
    `).run(name, type, questions, active ? 1 : 0, req.params.id);
    
    res.json({ 
      success: true,
      message: 'Template updated successfully' 
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Get survey by token (public endpoint)
app.get('/api/survey/:token', (req, res) => {
  try {
    const token = req.params.token;
    
    const survey = db.prepare(`
      SELECT s.*, c.name as client_name, c.contact_person, c.email
      FROM surveys s
      JOIN clients c ON s.client_id = c.id
      WHERE s.token = ?
    `).get(token);
    
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found or has expired' });
    }
    
    if (survey.completed_date) {
      return res.status(400).json({ error: 'This survey has already been completed' });
    }
    
    res.json({
      survey_type: survey.survey_type,
      sent_date: survey.sent_date,
      client: {
        name: survey.client_name,
        contact_person: survey.contact_person,
        email: survey.email
      }
    });
  } catch (error) {
    console.error('Error fetching survey:', error);
    res.status(500).json({ error: 'Failed to load survey' });
  }
});

// Submit survey response (public endpoint)
app.post('/api/survey/:token/submit', (req, res) => {
  try {
    const token = req.params.token;
    const {
      overall_satisfaction,
      response_time,
      technical_knowledge,
      communication,
      recommend_score,
      what_we_do_well,
      what_to_improve,
      additional_comments
    } = req.body;
    
    const survey = db.prepare('SELECT * FROM surveys WHERE token = ?').get(token);
    
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    if (survey.completed_date) {
      return res.status(400).json({ error: 'Survey already completed' });
    }
    
    db.prepare(`
      UPDATE surveys 
      SET 
        overall_satisfaction = ?,
        response_time = ?,
        technical_knowledge = ?,
        communication = ?,
        recommend_score = ?,
        what_we_do_well = ?,
        what_to_improve = ?,
        additional_comments = ?,
        completed_date = datetime('now'),
        ip_address = ?,
        user_agent = ?
      WHERE token = ?
    `).run(
      overall_satisfaction,
      response_time,
      technical_knowledge,
      communication,
      recommend_score,
      what_we_do_well || null,
      what_to_improve || null,
      additional_comments || null,
      req.ip,
      req.headers['user-agent'],
      token
    );
    
    const avgScore = (overall_satisfaction + response_time + technical_knowledge + communication + recommend_score) / 5;
    const clientId = survey.client_id;
    
    const completedSurveys = db.prepare(`
      SELECT (overall_satisfaction + response_time + technical_knowledge + communication + recommend_score) / 5.0 as avg
      FROM surveys
      WHERE client_id = ? AND completed_date IS NOT NULL
    `).all(clientId);
    
    const totalAvg = completedSurveys.reduce((sum, s) => sum + s.avg, 0) / completedSurveys.length;
    
    db.prepare('UPDATE clients SET score = ? WHERE id = ?').run(Math.round(totalAvg * 10) / 10, clientId);
    
    res.json({ 
      success: true,
      message: 'Survey submitted successfully',
      average_score: Math.round(avgScore * 10) / 10
    });
  } catch (error) {
    console.error('Error submitting survey:', error);
    res.status(500).json({ error: 'Failed to submit survey' });
  }
});

// Get survey statistics for dashboard
app.get('/api/surveys/statistics', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_surveys,
        COUNT(CASE WHEN completed_date IS NOT NULL THEN 1 END) as completed,
        COUNT(CASE WHEN completed_date IS NULL THEN 1 END) as pending,
        ROUND(AVG(CASE WHEN completed_date IS NOT NULL 
          THEN (overall_satisfaction + response_time + technical_knowledge + communication + recommend_score) / 5.0 
          END), 1) as average_score,
        ROUND(AVG(recommend_score), 1) as nps_score
      FROM surveys
    `).get();
    
    const recentResponses = db.prepare(`
      SELECT 
        s.*,
        c.name as client_name,
        (s.overall_satisfaction + s.response_time + s.technical_knowledge + s.communication + s.recommend_score) / 5.0 as avg_score
      FROM surveys s
      JOIN clients c ON s.client_id = c.id
      WHERE s.completed_date IS NOT NULL
        AND (s.archived = 0 OR s.archived IS NULL)
      ORDER BY s.completed_date DESC
      LIMIT 10
    `).all();
    
    res.json({
      stats,
      recent_responses: recentResponses
    });
  } catch (error) {
    console.error('Error fetching survey statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get all survey responses with details (NEW ENDPOINT)
app.get('/api/surveys/responses', (req, res) => {
  try {
    const responses = db.prepare(`
      SELECT 
        s.*,
        c.name as client_name,
        (s.overall_satisfaction + s.response_time + s.technical_knowledge + s.communication + s.recommend_score) / 5.0 as avg_score
      FROM surveys s
      JOIN clients c ON s.client_id = c.id
      WHERE s.completed_date IS NOT NULL
        AND (s.archived = 0 OR s.archived IS NULL)
      ORDER BY s.completed_date DESC
    `).all();
    
    res.json(responses);
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// Archive a survey
app.post('/api/surveys/:id/archive', (req, res) => {
  try {
    const surveyId = req.params.id;
    
    const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId);
    
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    // Note: archived column check removed - run migrate-add-archive.js to add archived functionality
    // if (survey.archived === 1) {
    //   return res.status(400).json({ error: 'Survey is already archived' });
    // }
    
    db.prepare(`
      UPDATE surveys 
      SET archived = 1, archived_date = datetime('now')
      WHERE id = ?
    `).run(surveyId);
    
    res.json({ 
      success: true, 
      message: 'Survey archived successfully',
      archived_date: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error archiving survey:', error);
    res.status(500).json({ error: 'Failed to archive survey' });
  }
});

// Get all archived surveys
app.get('/api/surveys/archived', (req, res) => {
  try {
    const archived = db.prepare(`
      SELECT 
        s.*,
        c.name as client_name,
        (s.overall_satisfaction + s.response_time + s.technical_knowledge + s.communication + s.recommend_score) / 5.0 as avg_score,
        strftime('%Y', s.archived_date) as year,
        strftime('%m', s.archived_date) as month,
        strftime('%Y-%m', s.archived_date) as year_month
      FROM surveys s
      JOIN clients c ON s.client_id = c.id
      WHERE s.archived = 1
      ORDER BY s.archived_date DESC
    `).all();
    
    // Organize by client, year, month
    const organized = {};
    
    archived.forEach(survey => {
      const clientName = survey.client_name;
      const yearMonth = survey.year_month || 'Unknown';
      
      if (!organized[clientName]) {
        organized[clientName] = {};
      }
      
      if (!organized[clientName][yearMonth]) {
        organized[clientName][yearMonth] = {
          year: survey.year,
          month: survey.month,
          surveys: []
        };
      }
      
      organized[clientName][yearMonth].surveys.push(survey);
    });
    
    res.json({
      total: archived.length,
      organized: organized
    });
  } catch (error) {
    console.error('Error fetching archived surveys:', error);
    res.status(500).json({ error: 'Failed to fetch archived surveys' });
  }
});

// Get all pending surveys
app.get('/api/surveys/pending', (req, res) => {
  try {
    const pending = db.prepare(`
      SELECT 
        s.id,
        s.token,
        s.survey_type,
        s.sent_date,
        c.id as client_id,
        c.name as client_name,
        c.email,
        c.contact_person,
        CAST(julianday('now') - julianday(s.sent_date) AS INTEGER) as days_pending
      FROM surveys s
      JOIN clients c ON s.client_id = c.id
      WHERE s.sent_date IS NOT NULL 
        AND s.completed_date IS NULL
        AND (s.archived IS NULL OR s.archived = 0)
      ORDER BY s.sent_date ASC
    `).all();
    
    res.json({
      total: pending.length,
      surveys: pending
    });
  } catch (error) {
    console.error('Error fetching pending surveys:', error);
    res.status(500).json({ error: 'Failed to fetch pending surveys' });
  }
});

// Resend survey email
app.post('/api/surveys/:id/resend', async (req, res) => {
  try {
    const surveyId = req.params.id;
    
    const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId);
    
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }
    
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(survey.client_id);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    if (!client.email) {
      return res.status(400).json({ error: 'Client has no email address' });
    }
    
    // Use existing token
    const frontendUrl = process.env.FRONTEND_URL || 'https://northwind-survey-frontend.onrender.com';
    const surveyLink = `${frontendUrl}/survey/${survey.token}`;
    
    // Resend email
    await emailService.sendSurveyEmail(client, survey.survey_type || 'Quarterly', surveyLink);
    
    // Update sent_date to current time (UTC ISO string)
    const nowIso = new Date().toISOString();
    db.prepare("UPDATE surveys SET sent_date = ? WHERE id = ?").run(nowIso, surveyId);
    
    res.json({ 
      success: true, 
      message: `Survey email resent to ${client.email}`,
      surveyLink: surveyLink
    });
  } catch (error) {
    console.error('Error resending survey:', error);
    res.status(500).json({ error: 'Failed to resend survey' });
  }
});

// Send survey to a single client
app.post('/api/surveys/send/:clientId', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const { surveyType } = req.body; // Accept survey type from request
    
    const client = db.prepare('SELECT * FROM clients WHERE id = ? OR autotask_id = ?').get(clientId, clientId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    if (!client.email) {
      return res.status(400).json({ error: 'Client has no email address' });
    }
    
    // Default to Quarterly if not specified
    const selectedSurveyType = surveyType || 'Quarterly';
    
    const token = crypto.randomBytes(32).toString('hex');
    
    const nowIso = new Date().toISOString();
    db.prepare(`
      INSERT INTO surveys (client_id, token, survey_type, sent_date)
      VALUES (?, ?, ?, ?)
    `).run(client.id, token, selectedSurveyType, nowIso);
    
    // Use frontend URL from environment or default
    const frontendUrl = process.env.FRONTEND_URL || 'https://northwind-survey-frontend.onrender.com';
    const surveyLink = `${frontendUrl}/survey/${token}`;
    
    await emailService.sendSurveyEmail(client, selectedSurveyType, surveyLink);
    
    db.prepare("UPDATE clients SET last_survey = ? WHERE id = ?").run(nowIso, client.id);
    
    res.json({ 
      success: true, 
      message: `Survey sent to ${client.email}`,
      surveyToken: token,
      surveyLink: surveyLink
    });
  } catch (error) {
    console.error('Error sending survey:', error);
    res.status(500).json({ error: 'Failed to send survey' });
  }
});

// Schedule survey for client
app.post('/api/clients/:id/schedule-survey', (req, res) => {
  try {
    // Admin check
    const userEmail = req.body.userEmail || req.headers['x-user-email'];
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const userName = req.body.userName || req.headers['x-user-name'] || userEmail.split('@')[0];
    
    const clientId = req.params.id;
    const { days } = req.body;
    
    const client = db.prepare('SELECT * FROM clients WHERE id = ? OR autotask_id = ?').get(clientId, clientId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Get old survey_frequency for audit
    const oldFrequency = client.survey_frequency;
    
    // If days is null, clear the schedule (Never option)
    if (days === null) {
      db.prepare(`
        UPDATE clients 
        SET next_survey = NULL,
            survey_frequency = NULL
        WHERE id = ?
      `).run(client.id);
      
      // Log audit event
      logAuditEvent(
        userEmail,
        userName,
        'Changed survey scheduling',
        'client',
        client.id,
        { survey_frequency: oldFrequency },
        { survey_frequency: null }
      );
      
      return res.json({ 
        success: true,
        next_survey: null,
        survey_frequency: null,
        message: 'Survey schedule cleared'
      });
    }
    
    // Calculate next survey date from last_survey if it exists, otherwise from now
    const baseDate = client.last_survey ? new Date(client.last_survey) : new Date();
    const nextSurveyDate = new Date(baseDate);
    nextSurveyDate.setDate(nextSurveyDate.getDate() + days);
    
    // Update both next_survey date AND survey_frequency
    db.prepare(`
      UPDATE clients 
      SET next_survey = ?,
          survey_frequency = ?
      WHERE id = ?
    `).run(nextSurveyDate.toISOString(), days, client.id);
    
    // Log audit event
    logAuditEvent(
      userEmail,
      userName,
      'Changed survey scheduling',
      'client',
      client.id,
      { survey_frequency: oldFrequency },
      { survey_frequency: days }
    );
    
    res.json({ 
      success: true,
      next_survey: nextSurveyDate.toISOString(),
      survey_frequency: days,
      message: `Survey scheduled for ${days} days from last survey`
    });
  } catch (error) {
    console.error('Error scheduling survey:', error);
    res.status(500).json({ error: 'Failed to schedule survey' });
  }
});

// Sync companies from Autotask
app.post('/api/sync/companies', async (req, res) => {
  try {
    // Admin check
    const userEmail = req.body.userEmail || req.headers['x-user-email'];
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const userName = req.body.userName || req.headers['x-user-name'] || userEmail.split('@')[0];
    
    console.log('🔄 Starting company sync from Autotask...');
    const countBefore = db.prepare('SELECT COUNT(*) as count FROM clients').get();
    const { syncFromAutotask } = require('./sync-autotask');
    await syncFromAutotask();
    
    const countAfter = db.prepare('SELECT COUNT(*) as count FROM clients').get();
    const syncedCount = countAfter.count - countBefore.count;
    
    // Log audit event
    logAuditEvent(
      userEmail,
      userName,
      'Synced companies',
      null,
      null,
      null,
      { totalCompanies: countAfter.count, syncedCount: syncedCount }
    );
    
    res.json({ 
      success: true, 
      message: 'Company sync completed successfully',
      totalCompanies: countAfter.count
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Sync contacts from Autotask
app.post('/api/sync/contacts', async (req, res) => {
  try {
    // Admin check
    const userEmail = req.body.userEmail || req.headers['x-user-email'];
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const userName = req.body.userName || req.headers['x-user-name'] || userEmail.split('@')[0];
    
    console.log('🔄 Starting contact sync from Autotask...');
    const countBefore = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
    const { syncContactsFromAutotask } = require('./sync-contacts');
    await syncContactsFromAutotask();
    
    const countAfter = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
    const syncedCount = countAfter.count - countBefore.count;
    
    // Log audit event
    logAuditEvent(
      userEmail,
      userName,
      'Synced contacts',
      null,
      null,
      null,
      { totalContacts: countAfter.count, syncedCount: syncedCount }
    );
    
    res.json({ 
      success: true, 
      message: 'Contact sync completed successfully',
      totalContacts: countAfter.count
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete all survey data (admin endpoint)
app.post('/api/admin/delete-all-surveys', (req, res) => {
  try {
    // Admin check
    const userEmail = req.body.userEmail || req.headers['x-user-email'];
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const userName = req.body.userName || req.headers['x-user-name'] || userEmail.split('@')[0];
    
    // Get count before deletion for audit
    const countBefore = db.prepare('SELECT COUNT(*) as count FROM surveys').get();
    
    // Delete all surveys
    const deleteResult = db.prepare('DELETE FROM surveys').run();
    
    // Reset client scores to 0
    const resetScores = db.prepare('UPDATE clients SET score = 0 WHERE score > 0').run();
    
    // Clear last_survey dates
    const resetDates = db.prepare('UPDATE clients SET last_survey = NULL').run();
    
    // Log audit event
    logAuditEvent(
      userEmail,
      userName,
      'Deleted all survey data',
      null,
      null,
      { deleted_surveys: countBefore.count, reset_scores: resetScores.changes, reset_dates: resetDates.changes },
      null
    );
    
    res.json({ 
      success: true, 
      message: 'All survey data deleted successfully',
      deleted_surveys: deleteResult.changes,
      reset_scores: resetScores.changes,
      reset_dates: resetDates.changes
    });
  } catch (error) {
    console.error('Error deleting survey data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get audit logs (admin only)
app.get('/api/audit-logs', isAdmin, (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT 
        al.*,
        CASE 
          WHEN al.entity_type = 'client' THEN c.name
          WHEN al.entity_type = 'survey' THEN 'Survey #' || al.entity_id
          ELSE NULL
        END as entity_name
      FROM audit_logs al
      LEFT JOIN clients c ON al.entity_type = 'client' AND al.entity_id = c.id
      ORDER BY al.timestamp DESC
      LIMIT 1000
    `).all();
    
    res.json({
      total: logs.length,
      logs: logs
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

app.listen(PORT, () => {
  console.log('Northwind Survey Server running on http://localhost:' + PORT);
});