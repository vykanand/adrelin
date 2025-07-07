const { signInAdrenalin, signOutAdrenalin, isDuringWorkingHours, getRandomTimeWithinWindow } = require('./auth');
const schedule = require('node-schedule');

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
                
                // Get current time and calculate random sign-in time
                const now = new Date();
                const signInTime = getRandomTimeWithinWindow(now, 30); // Random minute between 0-29
                
                const timeUntilSignIn = signInTime - now;
                if (timeUntilSignIn > 0) {
                    console.log(`⏳ Waiting ${Math.ceil(timeUntilSignIn / 1000)} seconds until sign-in time...`);
                    await new Promise(resolve => setTimeout(resolve, timeUntilSignIn));
                }

                console.log(`⏰ Starting sign-in at: ${signInTime.toLocaleTimeString()}`);
                const signInResult = await signInAdrenalin();
                
                if (signInResult.success) {
                    // Schedule sign-out between 5:00-6:00 PM (Monday to Friday)
                    schedule.scheduleJob('0 17 * * 1-5', async () => {
                        try {
                            // Get current time and calculate random sign-out time
                            const now = new Date();
                            const signOutTime = getRandomTimeWithinWindow(now, 60); // Random minute between 0-59
                            
                            const timeUntilSignOut = signOutTime - now;
                            if (timeUntilSignOut > 0) {
                                console.log(`⏳ Waiting ${Math.ceil(timeUntilSignOut / 1000)} seconds until sign-out time...`);
                                await new Promise(resolve => setTimeout(resolve, timeUntilSignOut));
                            }

                            console.log(`⏰ Starting sign-out at: ${signOutTime.toLocaleTimeString()}`);
                            const signOutResult = await signOutAdrenalin();
                            if (signOutResult.success) {
                                console.log('✅ Successfully signed out');
                            } else {
                                console.error('❌ Sign-out failed:', signOutResult.error);
                            }
                        } catch (error) {
                            console.error('❌ Error in daily sign-out:', error);
                        }
                    });
                } else {
                    console.error('❌ Sign-in failed:', signInResult.error);
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
