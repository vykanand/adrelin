const { signOutAdrenalin } = require('./signout.js');

async function testSignOut() {
    try {
        console.log('🚀 Starting signout test...');
        
        // Run the signout function
        const result = await signOutAdrenalin();
        
        if (result.loggedIn) {
            console.log('✅ Signout test passed successfully!');
        } else {
            console.error('❌ Signout test failed: Not logged in after signout');
        }
        
    } catch (error) {
        console.error('❌ Signout test failed:', error.message);
        console.error('Error details:', error);
    }
}

// Run the test
testSignOut();
