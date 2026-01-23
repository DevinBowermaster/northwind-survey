const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
require('isomorphic-fetch');

// Microsoft Graph Configuration
const GRAPH_CONFIG = {
  tenantId: process.env.AZURE_TENANT_ID,
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  senderEmail: process.env.EMAIL_SENDER
};

// Create authenticated Graph client
function getGraphClient() {
  const credential = new ClientSecretCredential(
    GRAPH_CONFIG.tenantId,
    GRAPH_CONFIG.clientId,
    GRAPH_CONFIG.clientSecret
  );

  const client = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken('https://graph.microsoft.com/.default');
        return token.token;
      }
    }
  });

  return client;
}

// Send a survey email
async function sendSurveyEmail(clientInfo, surveyType = 'Quarterly', surveyLink) {
  try {
    console.log('📧 Preparing to send email...');
    console.log('   Client:', clientInfo.name);
    console.log('   Email:', clientInfo.email);
    console.log('   Survey Link:', surveyLink);
    
    const client = getGraphClient();
    
    // Use provided survey link
    const surveyUrl = surveyLink;
    const surveyToken = surveyUrl.split('/survey/')[1];
    
    console.log('   Survey Token:', surveyToken);
    
    // Email content
    const emailSubject = `${surveyType} Survey - Northwind IT Services`;
    const emailBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #1e3a8a, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
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
                <a href="${surveyUrl}" class="button">Take Survey Now</a>
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

    // Send email via Microsoft Graph
    const sendMail = {
      message: {
        subject: emailSubject,
        body: {
          contentType: 'HTML',
          content: emailBody
        },
        toRecipients: [
          {
            emailAddress: {
              address: clientInfo.email
            }
          }
        ]
      },
      saveToSentItems: true
    };

    await client
      .api(`/users/${GRAPH_CONFIG.senderEmail}/sendMail`)
      .post(sendMail);

    console.log(`✅ Survey email sent to: ${clientInfo.email}`);
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
      // Generate token and survey link for each client
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const frontendUrl = process.env.FRONTEND_URL || 'https://northwind-survey-frontend.onrender.com';
      const surveyLink = `${frontendUrl}/survey/${token}`;
      
      // Create survey record in database
      const db = require('./database');
      db.prepare(`
        INSERT INTO surveys (client_id, token, survey_type, sent_date)
        VALUES (?, ?, ?, datetime('now'))
      `).run(client.id, token, 'Quarterly');
      
      const result = await sendSurveyEmail(client, 'Quarterly', surveyLink);
      results.sent.push({ client: client.name, email: client.email });
      
      // Small delay to avoid rate limits
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
  sendTestEmail
};