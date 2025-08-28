const puppeteer = require('puppeteer');
const config = require('./config');

/**
 * Safely clicks an element on the page with proper error handling and logging
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for the element to click
 * @param {string} description - Human-readable description of the element
 * @param {number} [timeout=30000] - Maximum time to wait for the element
 * @returns {Promise<boolean>} True if click was successful, false otherwise
 */
async function safeClick(page, selector, description, timeout = config.TIMEOUTS?.ELEMENT_WAIT || 30000) {
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

/**
 * Cleans up browser resources including all pages and the browser instance
 * @param {Browser} browser - Puppeteer browser instance to clean up
 */
async function cleanupBrowser(browser) {
  if (!browser) return;
  
  try {
    const pages = await browser.pages();
    for (const page of pages) {
      try {
        await page.close();
      } catch (e) {
        console.error('Error closing page:', e.message);
      }
    }
    await browser.close();
    console.log('🔒 Browser and all pages closed');
  } catch (error) {
    console.error('Error during browser cleanup:', error.message);
  }
}

/**
 * Main function to sign out from the application
 * @returns {Promise<Object>} Result object with success status and message
 */
async function signOutAdrenalin() {
  let browser;
  let page;
  const maxRetries = 2;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log('\n=== Starting Sign Out Process ===');
      
      // Launch browser with consistent options
      console.log('🌐 Launching browser...');
      const launchOptions = {
        ...config.LAUNCH_OPTIONS,
        headless: 'new',
        args: [
          ...(config.LAUNCH_OPTIONS?.args || []),
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote'
        ]
      };

      console.log('Browser launch options:', JSON.stringify(launchOptions, null, 2));
      browser = await puppeteer.launch(launchOptions);
      
      const context = await browser.createIncognitoBrowserContext();
      page = await context.newPage();
      
      // Set viewport and timeouts
      await page.setViewport(config.VIEWPORT || { width: 1920, height: 1080 });
      page.setDefaultTimeout(config.TIMEOUTS?.PAGE_LOAD || 60000);
      await page.setCacheEnabled(false);
      
      console.log(`🌐 Navigating to: ${config.URL}`);
      await page.goto(config.URL, { 
        waitUntil: 'domcontentloaded',
        timeout: config.TIMEOUTS?.PAGE_LOAD || 60000
      });

      // Wait for page to be fully loaded
      await page.waitForFunction(() => document.readyState === 'complete', { 
        timeout: config.TIMEOUTS?.PAGE_LOAD || 30000 
      });

      // Check if already on login page
      const isLoginPage = await page.evaluate(() => !!document.querySelector('input#txtID'));
      if (isLoginPage) {
        console.log('ℹ️ Already on login page - no need to sign out');
        await cleanupBrowser(browser);
        return { success: true, message: 'Already signed out' };
      }
      
      // Check if already logged in
      const isLoggedIn = await page.evaluate(() => !!document.querySelector('p.user_name'));
      if (!isLoggedIn) {
        console.log('🔍 Not logged in, no need to sign out');
        await cleanupBrowser(browser);
        return { success: true, message: 'Not logged in - no action needed' };
      }

      console.log('✅ User is logged in, proceeding with sign out...');
      await page.waitForTimeout(2000);
      
      // Try to find and click the dropdown toggle
      console.log('🔍 Step 1: Clicking dropdown toggle button...');
      try {
        await safeClick(
          page, 
          'a.dropdown-toggle.down_sign_popup', 
          'User Dropdown Toggle',
          config.TIMEOUTS?.ELEMENT_WAIT || 10000
        );
      } catch (error) {
        console.warn('⚠️ Could not find dropdown toggle, trying direct sign out button...');
      }

      // Try to find and click the Sign Out button
      console.log('🔍 Step 2: Clicking "Sign Me Out" button...');
      try {
        await safeClick(
          page,
          'button[apptxt="FXPR_MPPG_SIGNOUT"]',
          'Sign Out Button',
          config.TIMEOUTS?.ELEMENT_WAIT || 10000
        );
      } catch (error) {
        console.warn('⚠️ Could not find sign out button, checking if already signed out...');
        if (await page.$('input#txtID')) {
          console.log('✅ Already on login page - sign out successful');
          await cleanupBrowser(browser);
          return { success: true, message: 'Sign out completed successfully' };
        }
        throw error;
      }

      // Handle SweetAlert confirmation if it appears
      console.log('🔍 Step 3: Checking for confirmation dialog...');
      try {
        await safeClick(
          page,
          'button.swal2-confirm',
          'Confirmation Dialog OK Button',
          config.TIMEOUTS?.ELEMENT_WAIT || 5000
        );
      } catch (error) {
        console.log('ℹ️ No confirmation dialog found, continuing...');
      }

      // Wait for sign out to complete
      console.log('🔄 Step 4: Waiting for sign out to complete...');
      try {
        await page.waitForNavigation({ 
          waitUntil: 'domcontentloaded', 
          timeout: config.TIMEOUTS?.PAGE_LOAD || 15000 
        });
        
        // Verify successful sign out by checking for login form
        const isSignedOut = await page.evaluate(() => !!document.querySelector('input#txtID'));
        if (isSignedOut) {
          console.log('✅ Sign out successful - Login form detected');
          await cleanupBrowser(browser);
          return { 
            success: true, 
            message: 'Successfully signed out',
            redirectedTo: page.url()
          };
        }
        
        // Additional verification: Check for absence of user elements
        const userElementsCount = await page.evaluate(() => 
          document.querySelectorAll('p.user_name, .user-profile, .user-menu').length
        );
        
        if (userElementsCount === 0) {
          console.log('✅ Sign out successful - No user elements found');
          await cleanupBrowser(browser);
          return { 
            success: true, 
            message: 'Sign out completed successfully',
            noUserElements: true
          };
        }
        
        // If we get here, verification failed
        throw new Error('Could not verify successful sign out');
        
      } catch (navError) {
        console.warn('⚠️ Navigation timeout, checking current state...');
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'after-signout.png' });
        
        // Final verification attempts
        const isOnLoginPage = await page.evaluate(() => !!document.querySelector('input#txtID'));
        if (isOnLoginPage) {
          console.log('✅ Sign out successful - On login page after navigation timeout');
          await cleanupBrowser(browser);
          return { 
            success: true, 
            message: 'Sign out completed successfully',
            onLoginPage: true
          };
        }
        
        // If we can't verify sign out, throw the original error
        throw navError;
      }
      
    } catch (error) {
      console.error(`❌ Sign out process failed:`, error.message);
      retryCount++;
      
      if (retryCount >= maxRetries) {
        console.error('❌ Maximum retry attempts reached');
        if (browser) await cleanupBrowser(browser);
        throw error;
      }
      
      console.log(`🔄 Retrying... (${retryCount}/${maxRetries})`);
      
      // Clean up before retry
      if (browser) {
        await cleanupBrowser(browser);
        browser = null;
      }
      
      // Add a small delay before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return { success: false, message: 'Failed to sign out after multiple attempts' };
}

// Export the function
module.exports = { signOutAdrenalin };
