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

  try {
    console.log('\n=== Starting Sign Out Process ===');
    
    // Launch browser
    browser = await puppeteer.launch({
      ...config.LAUNCH_OPTIONS,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: false, // Set to true for production
      ignoreHTTPSErrors: true
    });

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
      console.log('🔍 Clicking login button...');
      await page.waitForSelector('label#lblLogin', { visible: true, timeout: 10000 });
      
      await page.evaluate(() => {
        const loginButton = document.querySelector('label#lblLogin');
        if (!loginButton) throw new Error('Login button not found');
        loginButton.click();
      });
      
      console.log('✅ Login button clicked');
      
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

    // STEP 1: Wait 5 seconds for page load after login
    console.log('⏳ Waiting 5 seconds for page to fully load...');
    await page.waitForTimeout(5000);

    // STEP 2: Click the dropdown toggle button
    console.log('🔍 Step 1: Clicking dropdown toggle button...');
    await page.waitForSelector('a.dropdown-toggle.down_sign_popup', { visible: true, timeout: 10000 });
    
    await page.evaluate(() => {
      const dropdown = document.querySelector('a.dropdown-toggle.down_sign_popup');
      if (!dropdown) throw new Error('Dropdown toggle not found');
      dropdown.click();
    });
    
    console.log('✅ Dropdown toggle clicked');

    // STEP 3: Click "Sign Me Out" button
    console.log('🔍 Step 2: Clicking "Sign Me Out" button...');
    await page.waitForSelector('button[apptxt="FXPR_MPPG_SIGNOUT"]', { visible: true, timeout: 10000 });
    
    await page.evaluate(() => {
      const signOutButton = document.querySelector('button[apptxt="FXPR_MPPG_SIGNOUT"]');
      if (!signOutButton) throw new Error('Sign Me Out button not found');
      signOutButton.click();
    });
    
    console.log('✅ "Sign Me Out" button clicked');

    // STEP 4: Wait 2 seconds
    console.log('⏳ Waiting 2 seconds...');
    await page.waitForTimeout(2000);

    // STEP 5: Click OK button in SweetAlert
    console.log('🔍 Step 3: Clicking OK button in SweetAlert...');
    await page.waitForSelector('button.swal2-confirm', { visible: true, timeout: 10000 });
    
    await page.evaluate(() => {
      const okButton = document.querySelector('button.swal2-confirm');
      if (!okButton) throw new Error('SweetAlert OK button not found');
      okButton.click();
    });
    
    console.log('✅ SweetAlert OK button clicked');

    // STEP 6: Wait for page redirect to confirm signout
    console.log('🔄 Step 4: Waiting for page redirect...');
    const currentUrl = page.url();
    
    try {
      await page.waitForNavigation({ 
        waitUntil: 'networkidle0',
        timeout: 15000 
      });
      
      const newUrl = page.url();
      console.log(`🔗 Page redirected from: ${currentUrl}`);
      console.log(`🔗 Page redirected to: ${newUrl}`);
      
      if (newUrl !== currentUrl) {
        console.log('✅ Sign out successful - page redirected');
        return { success: true, message: 'Sign out completed successfully' };
      } else {
        throw new Error('Sign out failed - no page redirect detected');
      }
      
    } catch (navigationError) {
      throw new Error(`Sign out failed - navigation timeout: ${navigationError.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Sign out process failed:`, error.message);
    throw error;
    
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('🔒 Browser closed');
      } catch (closeError) {
        console.error('❌ Error closing browser:', closeError.message);
      }
    }
  }
}

// Export the function directly
module.exports.signOutAdrenalin = signOutAdrenalin;
