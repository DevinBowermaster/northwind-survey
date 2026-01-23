require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const db = require('./database');
const emailService = require('./email-service');
const { startScheduler } = require('./scheduler');

const app = express();

app.use(cors()); 
app.use(express.json());

const PORT = 3000;

// Start the survey scheduler
startScheduler();

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
    const clients = db.prepare('SELECT * FROM clients').all();
    
    // Add contact count to each client
    const clientsWithCounts = clients.map(client => {
      const contactCount = db.prepare(
        'SELECT COUNT(*) as count FROM contacts WHERE company_autotask_id = ?'
      ).get(client.autotask_id);
      
      return {
        ...client,
        contact_count: contactCount.count
      };
    });
    
    res.json(clientsWithCounts);
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
    
    db.prepare(`
      UPDATE clients 
      SET email = ?, contact_person = ?
      WHERE autotask_id = ?
    `).run(
      contact.email,
      `${contact.first_name} ${contact.last_name}`.trim(),
      client.autotask_id
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
      ORDER BY s.completed_date DESC
    `).all();
    
    res.json(responses);
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

// Send survey to a single client
app.post('/api/surveys/send/:clientId', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const client = db.prepare('SELECT * FROM clients WHERE id = ? OR autotask_id = ?').get(clientId, clientId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    if (!client.email) {
      return res.status(400).json({ error: 'Client has no email address' });
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    
    db.prepare(`
      INSERT INTO surveys (client_id, token, survey_type, sent_date)
      VALUES (?, ?, ?, datetime('now'))
    `).run(client.id, token, 'Quarterly');
    
    const surveyLink = `http://localhost:5173/survey/${token}`;
    await emailService.sendSurveyEmail(client, 'Quarterly', surveyLink);
    
    db.prepare("UPDATE clients SET last_survey = datetime('now') WHERE id = ?").run(client.id);
    
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
    const clientId = req.params.id;
    const { days } = req.body;
    
    const client = db.prepare('SELECT * FROM clients WHERE id = ? OR autotask_id = ?').get(clientId, clientId);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // If days is null, clear the schedule (Never option)
    if (days === null) {
      db.prepare(`
        UPDATE clients 
        SET next_survey = NULL,
            survey_frequency = NULL
        WHERE id = ?
      `).run(client.id);
      
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
    console.log('🔄 Starting company sync from Autotask...');
    const { syncFromAutotask } = require('./sync-autotask');
    await syncFromAutotask();
    
    const count = db.prepare('SELECT COUNT(*) as count FROM clients').get();
    
    res.json({ 
      success: true, 
      message: 'Company sync completed successfully',
      totalCompanies: count.count
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
    console.log('🔄 Starting contact sync from Autotask...');
    const { syncContactsFromAutotask } = require('./sync-contacts');
    await syncContactsFromAutotask();
    
    const count = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
    
    res.json({ 
      success: true, 
      message: 'Contact sync completed successfully',
      totalContacts: count.count
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log('Northwind Survey Server running on http://localhost:' + PORT);
});
