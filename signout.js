// Install with:
// npm install puppeteer

const puppeteer = require('puppeteer');
const config = require('./config');

// Sign Out functionality with daily check
async function signOutAdrenalin() {
  // Check if we've already signed out today
  const today = new Date().toISOString().split('T')[0];
  const lastSignoutFile = './last_signout.txt';
  
  try {
    const lastSignoutDate = await page.evaluate(() => {
      try {
        return fs.readFileSync(lastSignoutFile, 'utf8');
      } catch (e) {
        return null;
      }
    });
    
    if (lastSignoutDate === today) {
      console.log('✅ Already signed out today - skipping');
      return { browser: null, page: null, loggedIn: false };
    }
  } catch (error) {
    console.warn('⚠️ Could not check last signout date:', error);
  }
  let browser;
  try {
    browser = await puppeteer.launch(config.LAUNCH_OPTIONS);
    const page = await browser.newPage();
    
    await page.setViewport(config.VIEWPORT);
    console.log(`🌐 Navigating to: ${config.URL}`);
    await page.goto(config.URL, { waitUntil: 'networkidle0', timeout: config.TIMEOUTS.PAGE_LOAD });

    // Wait for page to be fully loaded and theme to be applied
    await page.waitForFunction(() => {
      return document.readyState === 'complete' && document.querySelector('html').style.opacity === '1';
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

    // Wait for post-login actions with proper conditions
    console.log('⏳ Waiting for post-login actions...');
    const signoutButtonSelector = 'button.btn.primary_cstm_btn.btn-primary.btn-sm.green_color.mr-2.ng-star-inserted';
    const maxRetries = 3;
    let retryCount = 0;
    let buttonClicked = false;

    while (retryCount < maxRetries && !buttonClicked) {
      try {
        // Wait for the button to be clickable
        await page.waitForSelector(signoutButtonSelector, {
          timeout: config.TIMEOUTS.ELEMENT_WAIT,
          visible: true,
          state: 'attached'
        });

        console.log(`✅ Found signout button with selector: ${signoutButtonSelector}`);

        // Verify button is clickable
        const isClickable = await page.evaluate((selector) => {
          const button = document.querySelector(selector);
          if (!button) return false;
          // Check if button is visible and enabled
          return !button.disabled && window.getComputedStyle(button).display !== 'none';
        }, signoutButtonSelector);

        if (!isClickable) {
          throw new Error('Button is not clickable');
        }

        // Click the button with proper waiting
        console.log('🚀 Clicking signout button...');
        await page.evaluate((selector) => {
          const button = document.querySelector(selector);
          if (button) {
            // Wait for button to be ready
            const observer = new MutationObserver((mutations) => {
              mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'disabled') {
                  if (!button.disabled) {
                    button.click();
                    observer.disconnect();
                  }
                }
              });
            });
            
            // Start observing disabled attribute
            observer.observe(button, { attributes: true });
            
            // Initial check
            if (!button.disabled) {
              button.click();
              observer.disconnect();
            }
          }
        }, signoutButtonSelector);

        // Wait for button click effects with more robust waiting
        await page.waitForSelector('.swal2-modal', { timeout: config.TIMEOUTS.ELEMENT_WAIT });
        console.log('✅ Signout button click detected');
        buttonClicked = true;

        // Wait for any post-signout actions
        await page.waitForTimeout(2000);

      } catch (error) {
        retryCount++;
        console.log(`⚠️ Attempt ${retryCount} failed: ${error.message}`);
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying in 1 second...`);
          await page.waitForTimeout(1000);
        } else {
          console.error('❌ Failed to click signout button after multiple attempts');
          throw error;
        }
      }
    }

    // If we got here, the button was successfully clicked
    console.log('✅ Signout button found and clicked successfully');

    // Wait for any post-signout actions
    await page.waitForTimeout(3000);

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

    // Close browser gracefully
    await browser.close();

    // Record successful signout for today
    await page.evaluate((today) => {
      try {
        fs.writeFileSync(lastSignoutFile, today);
      } catch (e) {
        console.warn('⚠️ Could not record signout date:', e);
      }
    }, today);
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
