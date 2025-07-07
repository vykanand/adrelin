const puppeteer = require('puppeteer');
const config = require('./config');

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
    let browser;
    try {
        console.log('🔍 Checking if within working hours...');
        if (!isDuringWorkingHours()) {
            console.log('❌ Not during working hours - exiting');
            return false;
        }

        console.log('⏳ Waiting for scheduled time...');
        const now = new Date();
        const scheduledTime = getRandomTimeWithinWindow(now);
        
        // Wait until scheduled time
        const timeUntilScheduled = scheduledTime - now;
        if (timeUntilScheduled > 0) {
            console.log(`⏳ Waiting ${Math.ceil(timeUntilScheduled / 1000)} seconds until scheduled time...`);
            await new Promise(resolve => setTimeout(resolve, timeUntilScheduled));
        }

        console.log('⏰ Scheduled time reached - starting sign-in...');
        
        browser = await puppeteer.launch(config.LAUNCH_OPTIONS);
        const page = await browser.newPage();
        
        await page.setViewport(config.VIEWPORT);
        console.log(`🌐 Navigating to: ${config.URL}`);
        await page.goto(config.URL, { waitUntil: 'networkidle0', timeout: config.TIMEOUTS.PAGE_LOAD });

        // Wait for page to be fully loaded and theme to be applied
        await page.waitForFunction(() => {
            return document.readyState === 'complete' && 
                   document.querySelector('html').style.opacity === '1';
        }, { timeout: config.TIMEOUTS.ELEMENT_WAIT });

        // Set company field
        await page.evaluate((company) => {
            document.getElementById('hdnCompanyName').value = company;
        }, config.COMPANY);

        // Fill in login credentials
        console.log('🔍 Looking for login form elements...');
        
        // Username field
        const usernameSelector = 'input#txtID';
        await page.waitForSelector(usernameSelector, { timeout: config.TIMEOUTS.ELEMENT_WAIT });
        console.log(`✅ Found username field with selector: ${usernameSelector}`);
        console.log('👤 Entering username...');
        await page.type(usernameSelector, config.USERNAME, { delay: 100 });

        // Password field
        const passwordSelector = 'input#txtPwd';
        await page.waitForSelector(passwordSelector, { timeout: config.TIMEOUTS.ELEMENT_WAIT });
        console.log(`✅ Found password field with selector: ${passwordSelector}`);
        console.log('🔐 Entering password...');
        await page.type(passwordSelector, config.PASSWORD, { delay: 100 });

        // Login button
        const loginButtonSelector = 'input#LocalizedButton1';
        await page.waitForSelector(loginButtonSelector, { timeout: 5000 });
        console.log(`✅ Found login button with selector: ${loginButtonSelector}`);

        // Click login button using JavaScript to avoid element staleness
        console.log('🚀 Clicking login button...');
        await page.evaluate((selector) => {
            const button = document.querySelector(selector);
            if (button) {
                button.click();
            }
        }, loginButtonSelector);

        // Wait for navigation and post-login page
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: config.TIMEOUTS.NAVIGATION });
        await page.waitForTimeout(config.TIMEOUTS.POST_LOGIN);

        // Verify successful login by checking for user name element
        const userNameElement = await page.waitForSelector('p.user_name', { timeout: config.TIMEOUTS.USER_NAME });
        if (!userNameElement) {
            console.error('❌ Login failed - user name element not found');
            throw new Error('Login failed');
        }

        // Get user name text and verify it's not empty
        const userNameText = await page.evaluate(() => {
            const element = document.querySelector('p.user_name');
            if (!element || !element.textContent.trim()) {
                throw new Error('User name element found but text is empty');
            }
            return element.textContent.trim();
        });

        console.log(`✅ Login succeeded - found user name: ${userNameText}`);
        
        return { success: true, browser, page, userName: userNameText };

    } catch (error) {
        console.error('❌ Error during login:', error);
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('❌ Error closing browser:', closeError);
            }
        }
        throw error;
    }
}

// Sign Out functionality
async function signOutAdrenalin(browser, page) {
    try {
        console.log('🔍 Checking if within working hours...');
        if (!isDuringWorkingHours()) {
            console.log('❌ Not during working hours - exiting');
            return false;
        }

        console.log('⏳ Waiting for scheduled time...');
        const now = new Date();
        const scheduledTime = getRandomTimeWithinWindow(now);
        
        // Wait until scheduled time
        const timeUntilScheduled = scheduledTime - now;
        if (timeUntilScheduled > 0) {
            console.log(`⏳ Waiting ${Math.ceil(timeUntilScheduled / 1000)} seconds until scheduled time...`);
            await new Promise(resolve => setTimeout(resolve, timeUntilScheduled));
        }

        console.log('⏰ Scheduled time reached - starting signout...');

        // Find and click the signout button
        console.log('🔍 Looking for signout button...');
        const signoutButtonSelector = 'button.btn.primary_cstm_btn.btn-primary.btn-sm.green_color.mr-2.ng-star-inserted';
        await page.waitForSelector(signoutButtonSelector, { timeout: config.TIMEOUTS.ELEMENT_WAIT });
        console.log(`✅ Found signout button with selector: ${signoutButtonSelector}`);

        // Click signout button
        console.log('🚀 Clicking signout button...');
        await page.evaluate((selector) => {
            const button = document.querySelector(selector);
            if (button) {
                button.click();
            }
        }, signoutButtonSelector);

        // Wait for any post-signout actions
        await page.waitForTimeout(3000);

        // Find and click the SweetAlert2 OK button
        console.log('🔍 Looking for SweetAlert2 OK button...');
        const okButtonSelector = '.swal2-confirm.swal2-styled';
        try {
            await page.waitForSelector(okButtonSelector, { timeout: config.TIMEOUTS.ELEMENT_WAIT });
            console.log(`✅ Found OK button with selector: ${okButtonSelector}`);
            
            // Click the OK button
            console.log('🚀 Clicking OK button...');
            await page.evaluate((selector) => {
                const button = document.querySelector(selector);
                if (button) {
                    button.click();
                }
            }, okButtonSelector);
            
            // Wait for any post-OK button actions
            await page.waitForTimeout(2000);
        } catch (error) {
            console.error('❌ Could not find or click OK button:', error);
            console.log('ℹ️ Continuing with signout verification...');
        }

        // Wait for navigation after OK click
        console.log('⏳ Waiting for navigation after OK click...');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: config.TIMEOUTS.NAVIGATION });
        
        // Verify signout by checking for login form
        const signoutSuccess = await page.evaluate(() => {
            // Check for login form elements
            const hasLoginForm = document.querySelector('input#txtID') !== null;
            const hasLoginButton = document.querySelector('input#LocalizedButton1') !== null;
            
            return hasLoginForm || hasLoginButton;
        });

        if (signoutSuccess) {
            console.log('✅ Signout completed successfully - found login form');
            return true;
        } else {
            console.error('❌ Signout failed - no signout confirmation found');
            throw new Error('Signout failed');
        }

    } catch (error) {
        console.error('❌ Error during signout:', error);
        throw error;
    }
}

module.exports = {
    signInAdrenalin,
    signOutAdrenalin,
    isDuringWorkingHours,
    getRandomTimeWithinWindow
};
