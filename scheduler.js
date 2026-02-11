const cron = require('node-cron');
const db = require('./database');
const emailService = require('./email-service');
const crypto = require('crypto');

// Run every day at 9:00 AM (Boise time by default)
const startScheduler = () => {
  const TIMEZONE = process.env.SURVEY_TIMEZONE || 'America/Boise';
  console.log(`📅 Survey scheduler started (time zone: ${TIMEZONE})`);
  
  // Run at 9:00 AM every day
  cron.schedule('0 9 * * *', async () => {
    console.log('\n🔄 Running scheduled survey check...');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Find clients with surveys scheduled for today
      const clientsDue = db.prepare(`
        SELECT * FROM clients 
        WHERE company_type = 'managed'
        AND send_surveys = 1
        AND email IS NOT NULL
        AND date(next_survey) <= date('now')
      `).all();
      
      console.log(`📧 Found ${clientsDue.length} clients due for surveys`);
      
      for (const client of clientsDue) {
        try {
          console.log(`  Sending survey to: ${client.name} (${client.email})`);
          
          // Create survey token
          const token = crypto.randomBytes(32).toString('hex');
          
          // Insert survey record
          db.prepare(`
            INSERT INTO surveys (client_id, token, survey_type, sent_date)
            VALUES (?, ?, ?, datetime('now'))
          `).run(client.id, token, 'Quarterly');
          
          // Send email
          const surveyLink = `http://localhost:5173/survey/${token}`;
          await emailService.sendSurveyEmail(client, 'Quarterly', surveyLink);
          
          // Update client record - use their survey_frequency (30/60/90) or default to 90
          const frequency = client.survey_frequency || 90;
          const nextSurvey = new Date();
          nextSurvey.setDate(nextSurvey.getDate() + frequency);
          
          db.prepare(`
            UPDATE clients 
            SET last_survey = datetime('now'),
                next_survey = ?
            WHERE id = ?
          `).run(nextSurvey.toISOString(), client.id);
          
          console.log(`  ✅ Survey sent to ${client.name}, next survey in ${frequency} days: ${nextSurvey.toISOString().split('T')[0]}`);
          
        } catch (error) {
          console.error(`  ❌ Failed to send survey to ${client.name}:`, error.message);
        }
      }
      
      console.log('✅ Scheduled survey check complete\n');
      
    } catch (error) {
      console.error('❌ Error in scheduled survey check:', error);
    }
  }, { timezone: TIMEZONE });
  
  // Also run immediately on startup for testing (optional - comment out in production)
  console.log('💡 Tip: Scheduler will run daily at 9:00 AM');
};

module.exports = { startScheduler };
