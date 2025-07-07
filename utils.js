const moment = require('moment');

// Check if current day is a weekday
function isWeekday() {
    const now = moment();
    const day = now.day(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    return day >= 1 && day <= 5; // Monday to Friday
}

// Get current time in IST
function getCurrentTimeIST() {
    return moment().utcOffset('+05:30').format('HH:mm:ss');
}

module.exports = {
    isWeekday,
    getCurrentTimeIST
};
