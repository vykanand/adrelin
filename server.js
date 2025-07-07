const puppeteer = require('puppeteer');
const config = require('./config');
const { signInAdrenalin, signOutAdrenalin, isDuringWorkingHours } = require('./auth');
const schedule = require('node-schedule');

// Helper function to generate random time between 9 AM and 6 PM
// Helper function to generate random time within 20 minutes window
function getRandomTimeWithinWindow(baseTime, windowMinutes = 20) {
    const now = new Date(baseTime);
    const randomMinutes = Math.floor(Math.random() * windowMinutes);
    now.setMinutes(now.getMinutes() + randomMinutes);
    return now;
}

// Main server function
async function startServer() {
    console.log('Starting Adrenalin Automation Server...');
    
    // Schedule daily tasks
    schedule.scheduleJob('0 0 * * *', async () => {
        console.log('⏰ Starting new day scheduling...');
        
        // Schedule sign-in between 9:00-9:30 AM (Monday to Friday)
        schedule.scheduleJob('0 9 * * 1-5', async () => {
            try {
                console.log('🔑 Starting daily sign-in process...');
                
                // Wait until random time between 9:00-9:30 AM
                const now = new Date();
                const signInTime = new Date(now);
                signInTime.setHours(9, Math.floor(Math.random() * 30), 0, 0); // Random minute between 0-29
                
                const timeUntilSignIn = signInTime - now;
                if (timeUntilSignIn > 0) {
                    console.log(`⏳ Waiting ${Math.ceil(timeUntilSignIn / 1000)} seconds until sign-in time...`);
                    await new Promise(resolve => setTimeout(resolve, timeUntilSignIn));
                }

                console.log(`⏰ Starting sign-in at: ${signInTime.toLocaleTimeString()}`);
                const result = await signInAdrenalin();
                
                if (result.success) {
                    // Schedule sign-out between 5:00-6:00 PM (Monday to Friday)
                    schedule.scheduleJob('0 17 * * 1-5', async () => {
                        try {
                            // Wait until random time between 5:00-6:00 PM
                            const now = new Date();
                            const signOutTime = new Date(now);
                            signOutTime.setHours(17, Math.floor(Math.random() * 60), 0, 0); // Random minute between 0-59
                            
                            const timeUntilSignOut = signOutTime - now;
                            if (timeUntilSignOut > 0) {
                                console.log(`⏳ Waiting ${Math.ceil(timeUntilSignOut / 1000)} seconds until sign-out time...`);
                                await new Promise(resolve => setTimeout(resolve, timeUntilSignOut));
                            }

                            console.log(`⏰ Starting sign-out at: ${signOutTime.toLocaleTimeString()}`);
                            await signOutAdrenalin(result.browser, result.page);
                        } catch (error) {
                            console.error('❌ Error in daily sign-out:', error);
                        }
                    });
                }
            } catch (error) {
                console.error('❌ Error in daily sign-in:', error);
            }
        });
    });
}

// Start the server
startServer();

// Handle server shutdown gracefully
process.on('SIGINT', () => {
    console.log('🛑 Shutting down server...');
    schedule.gracefulShutdown();
    process.exit(0);
});
