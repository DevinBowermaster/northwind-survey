const Database = require('better-sqlite3');
const db = new Database('northwind.db');

console.log('Creating survey_templates table...');

// Create survey_templates table
db.exec(`
  CREATE TABLE IF NOT EXISTS survey_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    questions TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now'))
  )
`);

console.log('✅ survey_templates table created');

// Insert default templates
const defaultTemplates = [
  {
    name: 'Quarterly Check-In',
    type: 'Quarterly',
    questions: JSON.stringify([
      { text: 'How satisfied are you with our overall service?', type: 'rating' },
      { text: 'How would you rate our response time?', type: 'rating' },
      { text: 'How knowledgeable is our technical team?', type: 'rating' },
      { text: 'How effective is our communication?', type: 'rating' },
      { text: 'How likely are you to recommend Northwind to others?', type: 'rating' },
      { text: 'What do we do well?', type: 'text' },
      { text: 'What could we improve?', type: 'text' },
      { text: 'Any additional comments?', type: 'text' }
    ]),
    active: 1
  },
  {
    name: 'Post-Ticket Survey',
    type: 'Post-Ticket',
    questions: JSON.stringify([
      { text: 'How satisfied were you with the resolution?', type: 'rating' },
      { text: 'How would you rate the technician\'s expertise?', type: 'rating' },
      { text: 'How timely was the response?', type: 'rating' },
      { text: 'What could we have done better?', type: 'text' }
    ]),
    active: 1
  },
  {
    name: 'Post-Project Survey',
    type: 'Post-Project',
    questions: JSON.stringify([
      { text: 'How satisfied are you with the project outcome?', type: 'rating' },
      { text: 'Was the project delivered on time?', type: 'rating' },
      { text: 'How clear was communication throughout?', type: 'rating' },
      { text: 'Would you work with us on future projects?', type: 'rating' },
      { text: 'What went well with this project?', type: 'text' },
      { text: 'What could be improved for next time?', type: 'text' }
    ]),
    active: 1
  }
];

console.log('Inserting default templates...');

const insertTemplate = db.prepare(`
  INSERT INTO survey_templates (name, type, questions, active)
  VALUES (?, ?, ?, ?)
`);

for (const template of defaultTemplates) {
  insertTemplate.run(template.name, template.type, template.questions, template.active);
}

console.log('✅ Default templates inserted');
console.log('Migration complete!');

db.close();
