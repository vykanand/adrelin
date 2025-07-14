// Install with:
// npm install puppeteer

const puppeteer = require('puppeteer');
const config = require('./config');

// Sign Out functionality
async function signOutAdrenalin() {
  let browser;
  try {
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

    // Check if we're already logged in
    let userNameElement = await page.$('p.user_name');
    if (!userNameElement) {
      console.log('🔍 Not logged in, attempting to log in...');
      
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

      // Verify successful login
      userNameElement = await page.waitForSelector('p.user_name', { timeout: config.TIMEOUTS.USER_NAME });
      if (!userNameElement) {
        console.error('❌ Login failed - user name element not found');
        throw new Error('Login failed');
      }
      console.log('✅ Login successful');
    }

    // Verify user is logged in
    if (!userNameElement) {
      console.error('❌ User not logged in - user name element not found');
      throw new Error('User not logged in');
    }

    // Find and click the dropdown toggle
    console.log('🔍 Looking for dropdown toggle...');
    const dropdownToggleSelector = 'a.dropdown-toggle.down_sign_popup';
    await page.waitForSelector(dropdownToggleSelector, { timeout: config.TIMEOUTS.ELEMENT_WAIT });
    console.log(`✅ Found dropdown toggle with selector: ${dropdownToggleSelector}`);
    
    // Click the dropdown toggle
    console.log('🚀 Clicking dropdown toggle...');
    await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      if (button) {
        button.click();
      }
    }, dropdownToggleSelector);

    // Wait for dropdown menu to appear
    await page.waitForTimeout(1000);

    // Find and click the sign out button
    console.log('🔍 Looking for sign out button...');
    const signOutButtonSelector = 'button.btn.primary_cstm_btn.btn-primary.btn-sm.green_color.mr-2';
    await page.waitForSelector(signOutButtonSelector, { timeout: config.TIMEOUTS.ELEMENT_WAIT });
    console.log(`✅ Found sign out button with selector: ${signOutButtonSelector}`);
    
    // Click the sign out button
    console.log('🚀 Clicking sign out button...');
    await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      if (button) {
        button.click();
      }
    }, signOutButtonSelector);

    // Wait for the sweet alert popup to appear
    await page.waitForTimeout(1000);

    // Find and click the OK button in sweet alert
    console.log('🔍 Looking for sweet alert OK button...');
    const okButtonSelector = 'button.swal2-confirm.swal2-styled';
    await page.waitForSelector(okButtonSelector, { timeout: config.TIMEOUTS.ELEMENT_WAIT });
    console.log(`✅ Found sweet alert OK button with selector: ${okButtonSelector}`);
    
    // Click the OK button
    console.log('🚀 Clicking sweet alert OK button...');
    await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      if (button) {
        button.click();
      }
    }, okButtonSelector);

    // Wait for navigation after signout
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: config.TIMEOUTS.NAVIGATION });
    await page.waitForTimeout(config.TIMEOUTS.POST_LOGIN);

    // Verify successful signout by checking for login form
    const loginForm = await page.waitForSelector('input#txtID', { timeout: config.TIMEOUTS.ELEMENT_WAIT });
    if (!loginForm) {
      console.error('❌ Signout failed - login form not found');
      throw new Error('Signout failed');
    }

    console.log('✅ Signout successful');
    return { browser, page, loggedIn: false };
  } catch (error) {
    console.error('❌ Error during signout:', error);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (err) {
        console.error('❌ Error closing browser:', err);
      }
    }
  }

  return { browser: null, page: null, loggedIn: true };
}

// Export the function directly
module.exports.signOutAdrenalin = signOutAdrenalin;
