require('dotenv').config();
const nodemailer = require('nodemailer');

// AWS SES SMTP transporter (uses env: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD)
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587 STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },
    tls: {
      rejectUnauthorized: true
      // Optional: if you see TLS errors with SES, you can try minVersion: 'TLSv1.2'
    }
  });
}

// Send a survey email via AWS SES SMTP
async function sendSurveyEmail(clientInfo, surveyType = 'Quarterly', surveyLink) {
  try {
    console.log('📧 Preparing to send email...');
    console.log('   Client:', clientInfo.name);
    console.log('   Email:', clientInfo.email);
    console.log('   Survey Link:', surveyLink);

    const fromEmail = process.env.SMTP_FROM_EMAIL;
    const fromName = process.env.SMTP_FROM_NAME || 'Northwind MSP';
    if (!fromEmail || !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error('Missing SMTP configuration. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL in .env');
    }

    const surveyUrl = surveyLink;
    const surveyToken = surveyUrl.split('/survey/')[1];
    console.log('   Survey Token:', surveyToken);

    const emailSubject = `${surveyType} Survey - Northwind IT Services`;
    const emailBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #1e3a8a, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            /* Take Survey button uses inline styles below for email client compatibility */
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 ${surveyType} Survey</h1>
              <p>Your feedback helps us serve you better</p>
            </div>
            <div class="content">
              <p>Hello ${clientInfo.contact_person || clientInfo.name},</p>
              
              <p>We hope you're doing well! As part of our commitment to providing excellent service, we'd love to hear your feedback.</p>
              
              <p><strong>This survey takes less than 2 minutes to complete.</strong></p>
              
              <p style="text-align: center;">
                <a href="${surveyUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; text-align: center; margin: 20px 0;">Take Survey</a>
              </p>
              
              <p>Your responses help us:</p>
              <ul>
                <li>Improve our service quality</li>
                <li>Address any concerns quickly</li>
                <li>Better understand your needs</li>
              </ul>
              
              <p>Thank you for being a valued client!</p>
              
              <p>Best regards,<br>
              <strong>Northwind IT Services Team</strong><br>
              Boise, Idaho</p>
              
              <div class="footer">
                <p>This survey link expires in 30 days. If you have any questions, please contact us.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log('   Email body length:', emailBody.length);
    console.log('   Subject:', emailSubject);

    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: clientInfo.email,
      subject: emailSubject,
      html: emailBody
    });

    console.log(`✅ Survey email sent to: ${clientInfo.email}`);
    if (info.messageId) console.log(`   SES Message ID: ${info.messageId}`);
    console.log(`   Survey URL: ${surveyUrl}`);

    return {
      success: true,
      surveyToken,
      sentTo: clientInfo.email
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

// Send surveys to all managed clients
async function sendSurveysToManagedClients(clients) {
  console.log(`📧 Sending surveys to ${clients.length} managed clients...`);

  const results = {
    sent: [],
    failed: []
  };

  for (const client of clients) {
    if (!client.email) {
      console.log(`⚠️  Skipping ${client.name} - no email address`);
      results.failed.push({ client: client.name, reason: 'No email' });
      continue;
    }

    try {
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const frontendUrl = process.env.FRONTEND_URL || 'https://northwind-survey-frontend.onrender.com';
      const surveyLink = `${frontendUrl}/survey/${token}`;

      const db = require('./database');
      db.prepare(`
        INSERT INTO surveys (client_id, token, survey_type, sent_date)
        VALUES (?, ?, ?, datetime('now'))
      `).run(client.id, token, 'Quarterly');

      const result = await sendSurveyEmail(client, 'Quarterly', surveyLink);
      results.sent.push({ client: client.name, email: client.email });

      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Failed to send to ${client.name}:`, error.message);
      results.failed.push({ client: client.name, reason: error.message });
    }
  }

  console.log(`\n✅ Sent: ${results.sent.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);

  return results;
}

// Test email function
async function sendTestEmail(toEmail) {
  try {
    const testClient = {
      id: 999,
      name: 'Test Client',
      email: toEmail,
      contact_person: 'Test User'
    };

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const frontendUrl = process.env.FRONTEND_URL || 'https://northwind-survey-frontend.onrender.com';
    const surveyLink = `${frontendUrl}/survey/${token}`;

    const result = await sendSurveyEmail(testClient, 'Test', surveyLink);
    console.log('✅ Test email sent successfully!');
    return result;
  } catch (error) {
    console.error('❌ Test email failed:', error);
    throw error;
  }
}

module.exports = {
  sendSurveyEmail,
  sendSurveysToManagedClients,
  sendTestEmail,
  getTransporter
};
