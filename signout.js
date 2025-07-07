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
    await page.waitForTimeout(config.TIMEOUTS.POST_LOGIN); // Give extra time for post-login processing

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

    // Wait for any post-login actions
    await page.waitForTimeout(2000);

    // Wait for any post-login actions
    await page.waitForTimeout(2000);

    console.log('✅ Starting signout process...');

    // Find and click the signout button
    console.log('🔍 Looking for signout button...');
    const signoutButtonSelector = 'button.btn.primary_cstm_btn.btn-primary.btn-sm.green_color.mr-2.ng-star-inserted';
    await page.waitForSelector(signoutButtonSelector, { timeout: config.TIMEOUTS.ELEMENT_WAIT });
    console.log(`✅ Found signout button with selector: ${signoutButtonSelector}`);

    // Verify signout button exists
    console.log('🔍 Verifying signout button exists...');
    const signoutButtonExists = await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      return button !== null;
    }, signoutButtonSelector);

    if (signoutButtonExists) {
      console.log('✅ Signout button found successfully');
      
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
        
        // Wait for navigation after OK click
        console.log('⏳ Waiting for navigation after OK click...');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: config.TIMEOUTS.NAVIGATION });
        
        // If we got here, we've successfully navigated to a new page
        console.log('✅ Successfully navigated to new page - signout successful');
        return true;
      } catch (error) {
        console.error('❌ Error during OK button interaction:', error);
        throw error;
      }
    } else {
      console.error('❌ Signout button not found');
      throw new Error('Signout button not found');
    }

    // Wait for signout confirmation
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: config.TIMEOUTS.NAVIGATION });

    // Verify signout by checking for login form
    const loginFormElement = await page.waitForSelector('input#txtID', { timeout: config.TIMEOUTS.ELEMENT_WAIT });
    if (loginFormElement) {
      console.log('✅ Signout completed successfully - login form is visible');
    } else {
      console.error('❌ Signout failed - login form not found');
      throw new Error('Signout failed');
    }

    console.log('✅ Browser will now close gracefully');
    console.log('✅ Browser will now close gracefully');

    // Close browser gracefully
    await browser.close();

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
  
  return { browser: null, page: null, loggedIn: true };
}

// Export the function directly
module.exports.signOutAdrenalin = signOutAdrenalin;
