const { sendTestEmail } = require('./email-service');

// Replace with your email to test
const TEST_EMAIL = 'devin@northwind.us'; // Change this!

async function test() {
  console.log('🧪 Testing email system...\n');
  
  try {
    await sendTestEmail(TEST_EMAIL);
    console.log('\n✅ Success! Check your inbox!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

test();