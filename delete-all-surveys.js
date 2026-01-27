require('dotenv').config();
const db = require('./database');

/**
 * Delete all survey responses from the database
 * This script will:
 * 1. Show current survey count
 * 2. Delete all records from the surveys table
 * 3. Reset client scores that were calculated from surveys
 * 4. Keep the table structure intact
 */

function deleteAllSurveys() {
  console.log('🗑️  Deleting all survey responses...\n');
  
  try {
    // Get current count
    const countBefore = db.prepare('SELECT COUNT(*) as count FROM surveys').get();
    console.log(`📊 Current survey count: ${countBefore.count}`);
    
    if (countBefore.count === 0) {
      console.log('✅ No surveys to delete. Database is already empty.');
      return;
    }
    
    // Show breakdown by completion status
    const completed = db.prepare('SELECT COUNT(*) as count FROM surveys WHERE completed_date IS NOT NULL').get();
    const pending = db.prepare('SELECT COUNT(*) as count FROM surveys WHERE completed_date IS NULL').get();
    console.log(`   - Completed: ${completed.count}`);
    console.log(`   - Pending: ${pending.count}\n`);
    
    // Safety check - require NODE_ENV=production and CONFIRM_DELETE env var
    const isProduction = process.env.NODE_ENV === 'production';
    const confirmDelete = process.env.CONFIRM_DELETE === 'true';
    
    if (isProduction && !confirmDelete) {
      console.log('⚠️  PRODUCTION MODE DETECTED!');
      console.log('   To delete surveys in production, set CONFIRM_DELETE=true');
      console.log('   Example: CONFIRM_DELETE=true node delete-all-surveys.js\n');
      console.log('   This prevents accidental deletion in production.');
      return;
    }
    
    console.log('⚠️  WARNING: This will delete ALL survey records!');
    console.log('   The table structure will be preserved.\n');
    
    // Delete all surveys
    const result = db.prepare('DELETE FROM surveys').run();
    console.log(`✅ Deleted ${result.changes} survey records\n`);
    
    // Reset client scores that were calculated from surveys
    console.log('🔄 Resetting client scores...');
    const resetScores = db.prepare('UPDATE clients SET score = 0 WHERE score > 0').run();
    console.log(`✅ Reset ${resetScores.changes} client scores to 0\n`);
    
    // Reset last_survey dates (optional - comment out if you want to keep this data)
    console.log('🔄 Clearing last_survey dates...');
    const resetDates = db.prepare('UPDATE clients SET last_survey = NULL').run();
    console.log(`✅ Cleared last_survey dates for ${resetDates.changes} clients\n`);
    
    // Verify deletion
    const countAfter = db.prepare('SELECT COUNT(*) as count FROM surveys').get();
    console.log(`📊 Final survey count: ${countAfter.count}`);
    console.log('\n✅ All survey responses deleted successfully!');
    console.log('   Table structure preserved.');
    
  } catch (error) {
    console.error('❌ Error deleting surveys:', error.message);
    throw error;
  }
}

// Run the deletion
if (require.main === module) {
  deleteAllSurveys();
  db.close();
}

module.exports = { deleteAllSurveys };
