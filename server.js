const { signInAdrenalin, signOutAdrenalin, isDuringWorkingHours, getRandomTimeWithinWindow } = require('./auth');
const schedule = require('node-schedule');
const { sendEmail } = require('./email');

// Main server function
async function startServer() {
    console.log('Starting Adrenalin Automation Server...');
    
    // Function to get next scheduled time
    function getNextScheduledTime(isSignIn) {
        const now = new Date();
        const nextTime = new Date(now);
        
        // Get current day of week (0=Sunday, 1=Monday, etc)
        const currentDay = now.getDay();
        
        // Calculate days until next weekday (Monday to Friday)
        if (currentDay === 6) { // Saturday
            nextTime.setDate(now.getDate() + 2); // Skip to Monday
        } else if (currentDay === 0) { // Sunday
            nextTime.setDate(now.getDate() + 1); // Skip to Monday
        } else if (currentDay === 5) { // Friday
            // If it's Friday and after 9:20 AM, skip to Monday
            if (now.getHours() >= 9 && (now.getHours() > 9 || now.getMinutes() >= 20)) {
                nextTime.setDate(now.getDate() + 3); // Skip to Monday
            }
        }
        
        // Set time to 9:00 AM for sign-in
        nextTime.setHours(9, 0, 0, 0);
        
        // For sign-in, schedule between 9:00 AM and 9:20 AM
        if (isSignIn) {
            // If it's past 9:20 AM, schedule for tomorrow
            if (now.getHours() >= 9 && (now.getHours() > 9 || now.getMinutes() >= 20)) {
                nextTime.setDate(now.getDate() + 1);
                nextTime.setHours(9, 0, 0);
            } else {
                // Set random time between 9:00 AM and 9:20 AM
                const randomMinutes = Math.floor(Math.random() * 21); // 0 to 20 minutes
                nextTime.setHours(9, randomMinutes, 0);
            }
            
            // Calculate sign-out time ensuring minimum 9 hours
            const signInTime = new Date(nextTime);
            
            // First calculate minimum 9-hour duration
            const minimumSignOutTime = new Date(signInTime.getTime() + (9 * 60 * 60 * 1000));
            
            // If minimum time is before 6:00 PM, use that as base
            if (minimumSignOutTime.getHours() < 18) {
                const randomMinutes = Math.floor(Math.random() * 60); // Add random minutes
                minimumSignOutTime.setMinutes(minimumSignOutTime.getMinutes() + randomMinutes);
                return { signInTime, signOutTime: minimumSignOutTime };
            }
            
            // If minimum time is after 6:00 PM, set to random time between 5:00-6:00 PM
            const signOutTime = new Date(signInTime);
            const randomHour = 17 + Math.floor(Math.random() * 2); // 17 (5 PM) or 18 (6 PM)
            const randomMinute = Math.floor(Math.random() * 60);
            signOutTime.setHours(randomHour, randomMinute, 0);
            
            // Ensure we maintain at least 9 hours
            const duration = (signOutTime - signInTime) / (1000 * 60 * 60);
            if (duration < 9) {
                // If duration is less than 9 hours, adjust sign-in time earlier
                const adjustment = 9 - duration;
                signInTime.setHours(signInTime.getHours() - Math.floor(adjustment));
                signInTime.setMinutes(signInTime.getMinutes() - (adjustment % 1) * 60);
            }
            
            return { signInTime, signOutTime };
        }
        // For sign-out, schedule between 5:00 PM and 6:00 PM
        else {
            // If it's past 6:00 PM, schedule for tomorrow
            if (now.getHours() >= 18) {
                nextTime.setDate(now.getDate() + 1);
                nextTime.setHours(17, 0, 0); // Start at 5:00 PM tomorrow
            } else {
                // Set random time between 5:00 PM and 6:00 PM
                const randomHour = 17 + Math.floor(Math.random() * 2); // 17 (5 PM) or 18 (6 PM)
                const randomMinute = Math.floor(Math.random() * 60);
                nextTime.setHours(randomHour, randomMinute, 0);
            }
            return nextTime;
        }
    }

    // Function to calculate time until next scheduled event
    function getTimeUntil(nextTime) {
        const now = new Date();
        
        // If event has already passed, return 0 time
        if (now >= nextTime) {
            return '0h 0m 0s';
        }
        
        const diff = nextTime - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    }
    
    // Get initial scheduled times
    let { signInTime, signOutTime } = getNextScheduledTime(true);
    let nextSignInTime = signInTime;
    let nextSignOutTime = signOutTime;
    
    // Create a timer to update the display every second
    const timer = setInterval(async () => {
        const now = new Date();
        
        // Reset schedule if current time is past sign-out time
        if (now >= signOutTime) {
            ({ signInTime, signOutTime } = getNextScheduledTime(true));
            nextSignInTime = signInTime;
            nextSignOutTime = signOutTime;
        }
        
        // Calculate time until next events
        const timeUntilSignIn = now >= nextSignInTime ? '0h 0m 0s' : getTimeUntil(nextSignInTime);
        const timeUntilSignOut = now >= nextSignOutTime ? '0h 0m 0s' : getTimeUntil(nextSignOutTime);
        
        console.clear();
        console.log(`
=====================================
Adrenalin Automation Server
=====================================

Current Time: ${now.toLocaleString()}
Day: ${now.toLocaleDateString('en-US', { weekday: 'long' })}

Next Sign-In: ${nextSignInTime.toLocaleString()}
Time Until: ${timeUntilSignIn}

Next Sign-Out: ${nextSignOutTime.toLocaleString()}
Time Until: ${timeUntilSignOut}

Working Duration: ${Math.floor((nextSignOutTime - nextSignInTime) / (1000 * 60 * 60))}h ${Math.floor(((nextSignOutTime - nextSignInTime) % (1000 * 60 * 60)) / (1000 * 60))}m

=====================================
`);
    }, 1000);
    
    // Function to handle daily sign-in and sign-out
    async function handleDailySignInAndSignOut() {
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
                // Send sign-in success email
                await sendEmail('Adrenalin Sign-In Success', `
                Sign-In Successful at: ${new Date().toLocaleString()}
                
                Scheduled Sign-Out: ${signOutTime.toLocaleString()}
                `);
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
                            // Send sign-out success email
                            await sendEmail('Adrenalin Sign-Out Success', `
                            Sign-Out Successful at: ${new Date().toLocaleString()}
                            `);
                            console.log('✅ Successfully signed out');
                        } else {
                            // Send sign-out failure email
                            await sendEmail('Adrenalin Sign-Out Failed', `
                            Sign-Out Failed at: ${new Date().toLocaleString()}
                            Error: ${signOutResult.error}
                            `);
                            console.error('❌ Sign-out failed:', signOutResult.error);
                        }
                    } catch (error) {
                        // Send error email
                        await sendEmail('Adrenalin Sign-Out Error', `
                        Error during sign-out at: ${new Date().toLocaleString()}
                        Error: ${error.message}
                        `);
                        console.error('❌ Error in daily sign-out:', error);
                    }
                });
            } else {
                // Send sign-in failure email
                await sendEmail('Adrenalin Sign-In Failed', `
                Sign-In Failed at: ${new Date().toLocaleString()}
                Error: ${signInResult.error}
                `);
                console.error('❌ Sign-in failed:', signInResult.error);
            }
        } catch (error) {
            console.error('❌ Error in daily sign-in and sign-out:', error);
        }
    }

    // Schedule sign-in between 9:00-9:30 AM (Monday to Friday)
    schedule.scheduleJob('0 9 * * 1-5', handleDailySignInAndSignOut);

    // Handle server shutdown gracefully
    process.on('SIGINT', () => {
        console.log('🛑 Shutting down server...');
        schedule.gracefulShutdown();
        process.exit(0);
    });
}

// Start the server
startServer();
