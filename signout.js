// Install with:
// npm install puppeteer

const puppeteer = require('puppeteer');
const config = require('./config');

// Utility function to safely click an element
async function safeClick(page, selector, description, timeout = config.TIMEOUTS.ELEMENT_WAIT) {
  try {
    console.log(`🔍 Looking for: ${description} (${selector})`);
    await page.waitForSelector(selector, { 
      visible: true,
      timeout,
      state: 'attached'
    });
    
    console.log(`✅ Found: ${description}`);
    console.log(`🖱️  Clicking: ${description}`);
    
    await page.evaluate((s) => {
      const element = document.querySelector(s);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.click();
        return true;
      }
      return false;
    }, selector);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to click ${description}:`, error.message);
    return false;
  }
}

// Sign Out functionality
async function signOutAdrenalin() {
  let browser;
  const maxRetries = 3;
  let retryCount = 0;
  let success = false;

  while (retryCount < maxRetries && !success) {
    try {
      console.log(`\n=== Attempt ${retryCount + 1} of ${maxRetries} ===`);
      
      // Launch browser with error handling for ECONNREFUSED
      try {
        browser = await puppeteer.launch({
          ...config.LAUNCH_OPTIONS,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: false, // Set to true for production
          ignoreHTTPSErrors: true
        });
      } catch (launchError) {
        console.error('❌ Browser launch failed:', launchError.message);
        if (launchError.message.includes('ECONNREFUSED')) {
          throw new Error('Browser launch failed: Connection refused. Make sure Chrome/Chromium is properly installed.');
        }
        throw launchError;
      }

      const page = await browser.newPage();
      
      // Set default navigation timeout
      page.setDefaultNavigationTimeout(config.TIMEOUTS.PAGE_LOAD);
      page.setDefaultTimeout(config.TIMEOUTS.ELEMENT_WAIT);
      
      // Set viewport and user agent
      await page.setViewport(config.VIEWPORT);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      console.log(`🌐 Navigating to: ${config.URL}`);
      await page.goto(config.URL, { 
        waitUntil: 'networkidle0', 
        timeout: config.TIMEOUTS.PAGE_LOAD 
      });

      // Wait for page to be fully loaded
      await page.waitForFunction(
        () => document.readyState === 'complete',
        { timeout: config.TIMEOUTS.ELEMENT_WAIT }
      );

      // Check if already logged in
      const isLoggedIn = await page.evaluate(() => {
        return !!document.querySelector('p.user_name');
      });

      if (!isLoggedIn) {
        console.log('🔍 Not logged in, attempting to log in...');
        
        // Fill in login form
        await page.waitForSelector('input#txtID', { visible: true });
        await page.type('input#txtID', config.USERNAME, { delay: 50 });
        await page.type('input#txtPwd', config.PASSWORD, { delay: 50 });
        
        // Click login button
        await safeClick(page, 'input#LocalizedButton1', 'Login Button');
        
        // Wait for navigation after login
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.waitForTimeout(2000);
        
        // Verify login
        const loginSuccess = await page.evaluate(() => {
          return !!document.querySelector('p.user_name');
        });
        
        if (!loginSuccess) {
          throw new Error('Login verification failed');
        }
        
        console.log('✅ Login successful');
      } else {
        console.log('ℹ️ Already logged in');
      }

      // Sign out process
      console.log('🚪 Starting sign out process...');
      
      // Get current URL before sign out
      const currentUrl = page.url();
      
      // 1. Click the dropdown toggle
      console.log('🔍 Clicking dropdown toggle...');
      const dropdownClicked = await page.evaluate(() => {
        const dropdown = document.querySelector('a.dropdown-toggle.down_sign_popup');
        if (!dropdown) return false;
        dropdown.click();
        return true;
      });
      
      if (!dropdownClicked) {
        throw new Error('Failed to find or click dropdown toggle');
      }
      
      // Wait for dropdown to be fully visible
      await page.waitForSelector('div.dropdown-menu.cstm_width_dropdown', { visible: true, timeout: 5000 });
      
      // 2. Click the Exit button in the dropdown
      console.log('🔍 Clicking Exit button...');
      const exitButtonClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button.btn.primary_cstm_btn'));
        const exitButton = buttons.find(btn => btn.textContent.trim() === 'Exit');
        if (!exitButton) return false;
        exitButton.click();
        return true;
      });
      
      if (!exitButtonClicked) {
        throw new Error('Failed to find or click Exit button in dropdown');
      }
      
      // 3. Handle SweetAlert confirmation
      console.log('🔍 Handling SweetAlert confirmation...');
      await page.waitForTimeout(1000); // Wait for SweetAlert to appear
      
      const confirmClicked = await page.evaluate(() => {
        const confirmButton = Array.from(document.querySelectorAll('button.swal2-confirm'))
          .find(btn => btn.textContent.trim().toLowerCase().includes('ok') || btn.textContent.trim() === 'Yes');
        if (!confirmButton) return false;
        confirmButton.click();
        return true;
      });
      
      if (!confirmClicked) {
        throw new Error('Failed to find or click SweetAlert confirmation');
      }
      
      // 4. Wait for navigation away from current page
      console.log('🔄 Waiting for navigation after sign out...');
      try {
        await page.waitForNavigation({ 
          waitUntil: 'networkidle0',
          timeout: 10000 
        });
      } catch (e) {
        console.log('No navigation detected, checking URL change...');
      }
      
      // Verify we're no longer on the dashboard
      const newUrl = page.url();
      console.log(`🔗 URL after sign out: ${newUrl}`);
      
      if (newUrl === currentUrl) {
        throw new Error('Sign out failed - still on the same page');
      }
      
      // Additional check for login form
      const loginFormExists = await page.evaluate(() => {
        return !!document.querySelector('input#txtID');
      });
      
      if (!loginFormExists) {
        console.log('⚠️ Login form not found, but navigation occurred. Sign out might be successful.');
      }
      
      console.log('✅ Sign out successful');
      success = true;
      
      return { success: true, message: 'Sign out completed successfully' };
      
    } catch (error) {
      retryCount++;
      console.error(`❌ Attempt ${retryCount} failed:`, error.message);
      
      if (retryCount >= maxRetries) {
        console.error('❌ Max retries reached. Giving up.');
        throw error;
      }
      
      console.log(`🔄 Retrying in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('❌ Error closing browser:', closeError.message);
        }
      }
    }
  }
  
  if (!success) {
    throw new Error('Sign out process failed after all retries');
  }
}

// Export the function directly
module.exports.signOutAdrenalin = signOutAdrenalin;
