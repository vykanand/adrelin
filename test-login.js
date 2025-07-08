const puppeteer = require('puppeteer');
const { signInAdrenalin, signOutAdrenalin } = require('./auth');

async function testSignInSignOut() {
    const browser = await puppeteer.launch({
        headless: false, // Set to true for headless mode
        defaultViewport: null,
        args: ['--start-maximized']
    });

    try {
        console.log('🚀 Starting test sequence...');
        
      
        console.log('🔍 Starting sign-in process...');
        await signInAdrenalin(browser);
        console.log('✅ Sign-in successful!');
        
        
        
        // console.log('🔍 Starting sign-out process...');
        // await signOutAdrenalin(browser);
        // console.log('✅ Sign-out successful!');
        
    } catch (error) {
        console.error('❌ Error during test:', error);
    } finally {
        // Close browser
        console.log('✅ Closing browser...');
        await browser.close();
    }
}

// Run the test
testSignInSignOut();
