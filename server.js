const { signInAdrenalin, signOutAdrenalin, isDuringWorkingHours, getRandomTimeWithinWindow } = require('./auth');
const schedule = require('node-schedule');

// Main server function
async function startServer() {
    console.log('Starting Adrenalin Automation Server...');
    
    // Function to get next scheduled time
    function getNextScheduledTime(isSignIn) {
        const now = new Date();
        const nextTime = new Date(now);
        
        // Get current day of week (0=Sunday, 1=Monday, etc)
        const currentDay = now.getDay();
        
        // If it's Saturday or Sunday, wait until Monday
        if (currentDay === 6 || currentDay === 0) {
            nextTime.setDate(now.getDate() + (8 - currentDay));
            nextTime.setHours(9, 0, 0, 0);
            return nextTime;
        }
        
        // For sign-in, schedule between 9:00-9:30 AM
        if (isSignIn) {
            nextTime.setHours(9, 0, 0, 0);
            if (now.getHours() >= 9 || (now.getHours() === 9 && now.getMinutes() >= 30)) {
                // If it's past 9:30 AM, schedule for tomorrow
                nextTime.setDate(now.getDate() + 1);
            }
            nextTime.setMinutes(Math.floor(Math.random() * 30));
            
            // Generate random minutes between 0 and 30 (for 9.5 hours)
            const randomMinutes = Math.floor(Math.random() * 31); // 0-30 minutes
            
            // Calculate sign-out time (always 9 hours plus random minutes)
            const signInTime = new Date(nextTime);
            const signOutTime = new Date(signInTime.getTime() + 
                (9 * 60 * 60 * 1000) + // Always 9 hours
                (randomMinutes * 60 * 1000)      // Add random minutes (0-30)
            );
            
            // If sign-out time is after 6:30 PM, adjust to next day
            if (signOutTime.getHours() >= 18 && signOutTime.getMinutes() >= 30) {
                signOutTime.setDate(signOutTime.getDate() + 1);
                signOutTime.setHours(9, Math.floor(Math.random() * 30));
            }
            
            return { signInTime, signOutTime };
        }
        // For sign-out, schedule random time between 9:00-9:30 AM
        else {
            // If it's past 9:30 AM, schedule for tomorrow
            if (now.getHours() >= 9 || (now.getHours() === 9 && now.getMinutes() >= 30)) {
                nextTime.setDate(now.getDate() + 1);
            }
            // Set random time between 9:00-9:30 AM
            nextTime.setHours(9, Math.floor(Math.random() * 30), 0);
            return nextTime;
        }
    }

    // Function to calculate time until next scheduled event
    function getTimeUntil(nextTime) {
        const now = new Date();
        const diff = nextTime - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    // Get initial scheduled times
    const { signInTime, signOutTime } = getNextScheduledTime(true);
    const nextSignInTime = signInTime;
    const nextSignOutTime = signOutTime;
    
    // Create a timer to update the display every second
    const timer = setInterval(() => {
        const now = new Date();
        const timeUntilSignIn = getTimeUntil(nextSignInTime);
        const timeUntilSignOut = getTimeUntil(nextSignOutTime);
        
        console.clear();
        console.log(`
=====================================
Adrenalin Automation Server
=====================================

Current Time: ${now.toLocaleTimeString()}

Next Sign-In: ${nextSignInTime.toLocaleTimeString()}
Time Until: ${timeUntilSignIn}

Next Sign-Out: ${nextSignOutTime.toLocaleTimeString()}
Time Until: ${timeUntilSignOut}

=====================================
`);
    }, 1000);
    
    // Schedule sign-in between 9:00-9:30 AM (Monday to Friday)
    schedule.scheduleJob('0 9 * * 1-5', async () => {
        try {
            console.log('🔑 Starting daily sign-in process...');
            
            // Get current time and calculate random sign-in time within 9:00-9:30 AM window
            const now = new Date();
            const signInTime = new Date(now);
            signInTime.setHours(9, Math.floor(Math.random() * 30), 0); // Random minute between 0-29
            
            const timeUntilSignIn = signInTime - now;
            if (timeUntilSignIn > 0) {
                console.log(`⏳ Waiting ${Math.ceil(timeUntilSignIn / 1000)} seconds until sign-in time...`);
                await new Promise(resolve => setTimeout(resolve, timeUntilSignIn));
            }

            console.log(`⏰ Starting sign-in at: ${signInTime.toLocaleTimeString()}`);
            const signInResult = await signInAdrenalin();
            
            if (signInResult.success) {
                console.log('✅ Successfully signed in');
                
                // Schedule sign-out between 5:00-6:00 PM (Monday to Friday)
                schedule.scheduleJob('0 17 * * 1-5', async () => {
                    try {
                        console.log('🚪 Starting daily sign-out process...');
                        
                        // Get current time and calculate random sign-out time within 5:00-6:00 PM window
                        const now = new Date();
                        const signOutTime = new Date(now);
                        signOutTime.setHours(17, Math.floor(Math.random() * 60), 0); // Random minute between 0-59
                        
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

    // Handle server shutdown gracefully
    process.on('SIGINT', () => {
        console.log('🛑 Shutting down server...');
        clearInterval(timer);
        schedule.gracefulShutdown();
        process.exit(0);
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
