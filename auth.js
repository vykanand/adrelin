const { signInAdrenalin: signInFunction } = require('./signin');
const { signOutAdrenalin: signOutFunction } = require('./signout');

// Helper function to check if current time is within working hours
function isDuringWorkingHours() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    
    // Check if it's Monday to Friday (1-5)
    if (day < 1 || day > 5) return false;
    
    // Check if it's between 9 AM and 6 PM
    return hour >= 9 && hour < 18;
}

// Helper function to generate random time within 20 minutes window
function getRandomTimeWithinWindow(baseTime, windowMinutes = 20) {
    const now = new Date(baseTime);
    const randomMinutes = Math.floor(Math.random() * windowMinutes);
    now.setMinutes(now.getMinutes() + randomMinutes);
    return now;
}

// Sign In functionality
async function signInAdrenalin() {
    try {
        console.log('🔍 Checking if within working hours...');
        if (!isDuringWorkingHours()) {
            console.log('❌ Not during working hours - exiting');
            return { success: false, error: 'Not during working hours' };
        }

        console.log('🔑 Starting sign-in process...');
        await signInFunction();
        return { success: true };
    } catch (error) {
        console.error('❌ Sign-in failed:', error);
        return { success: false, error: error.message };
    }
}

// Sign Out functionality
async function signOutAdrenalin() {
    try {
        console.log('🔍 Checking if within working hours...');
        if (!isDuringWorkingHours()) {
            console.log('❌ Not during working hours - exiting');
            return { success: false, error: 'Not during working hours' };
        }

        console.log('🚪 Starting sign-out process...');
        await signOutFunction();
        return { success: true };
    } catch (error) {
        console.error('❌ Sign-out failed:', error);
        throw error;
    }
}

module.exports = {
    signInAdrenalin,
    signOutAdrenalin,
    isDuringWorkingHours,
    getRandomTimeWithinWindow
};
