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

// Function to clean up browser resources
async function cleanupBrowser(browser) {
  if (!browser) return;
  
  try {
    const pages = await browser.pages();
    for (const page of pages) {
      try {
        await page.close();
      } catch (e) { /* ignore */ }
    }
    await browser.close();
    console.log('🔒 Browser and all pages closed');
  } catch (closeError) {
    console.error('❌ Error during browser cleanup:', closeError.message);
  }
}

// Main sign out function
async function signOutAdrenalin() {
  let browser;
  const maxRetries = 2;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    let page;
    let context;
    
    try {
      console.log('\n=== Starting Sign Out Process ===');
      
      // Launch browser
      console.log('🌐 Launching browser...');
      browser = await puppeteer.launch({
        ...config.LAUNCH_OPTIONS,
        headless: false, // Set to true for production
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      context = await browser.createIncognitoBrowserContext();
      page = await context.newPage();
      
      // Set viewport from config
      await page.setViewport(config.VIEWPORT);
      page.setDefaultTimeout(30000);
      await page.setCacheEnabled(false);
      
      console.log(`🌐 Navigating to: ${config.URL}`);
      await page.goto(config.URL, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000,
        referer: 'https://www.google.com/'
      });

      // Wait for page to be fully loaded
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: 30000 });

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
      await page.screenshot({ path: 'before-signout.png' });
      
      // Try to find and click the dropdown toggle
      console.log('🔍 Step 1: Clicking dropdown toggle button...');
      try {
        await page.waitForSelector('a.dropdown-toggle.down_sign_popup', { 
          visible: true, 
          timeout: 10000 
        });
        
        await page.evaluate(() => {
          const dropdown = document.querySelector('a.dropdown-toggle.down_sign_popup');
          if (dropdown) {
            dropdown.scrollIntoView({ behavior: 'smooth', block: 'center' });
            dropdown.click();
          }
        });
        
        console.log('✅ Dropdown toggle clicked');
      } catch (error) {
        console.warn('⚠️ Could not find dropdown toggle, trying direct sign out button...');
      }

      // Try to find and click the Sign Out button
      console.log('🔍 Step 2: Clicking "Sign Me Out" button...');
      try {
        await page.waitForSelector('button[apptxt="FXPR_MPPG_SIGNOUT"]', { 
          visible: true, 
          timeout: 10000 
        });
        
        await page.evaluate(() => {
          const signOutButton = document.querySelector('button[apptxt="FXPR_MPPG_SIGNOUT"]');
          if (signOutButton) {
            signOutButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            signOutButton.click();
          }
        });
        
        console.log('✅ "Sign Me Out" button clicked');
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
        await page.waitForSelector('button.swal2-confirm', { 
          visible: true, 
          timeout: 5000 
        });
        
        await page.evaluate(() => {
          const okButton = document.querySelector('button.swal2-confirm');
          if (okButton) okButton.click();
        });
        
        console.log('✅ Confirmation dialog handled');
      } catch (error) {
        console.log('ℹ️ No confirmation dialog found, continuing...');
      }

      // Wait for sign out to complete
      console.log('🔄 Step 4: Waiting for sign out to complete...');
      try {
        // Wait for any navigation to complete
        await page.waitForNavigation({ 
          waitUntil: 'domcontentloaded', 
          timeout: 15000 
        });
        
        // Get the current URL after navigation
        const currentUrl = page.url();
        console.log(`🔗 Current URL after signout: ${currentUrl}`);
        
        // Check if we're on a different page than before (indicating successful signout)
        if (currentUrl !== config.URL) {
          console.log(`✅ Sign out successful - Redirected to: ${currentUrl}`);
          await cleanupBrowser(browser);
          return { 
            success: true, 
            message: 'Sign out completed successfully',
            redirectedTo: currentUrl
          };
        }
        
        // If URL didn't change, check for absence of user elements
        const isSignedOut = await page.evaluate(() => {
          const userElements = document.querySelectorAll('p.user_name, .user-profile, .user-menu');
          return userElements.length === 0;
        });
        
        if (isSignedOut) {
          console.log('✅ Sign out successful - User session ended');
          await cleanupBrowser(browser);
          return { 
            success: true, 
            message: 'Sign out completed successfully',
            sessionEnded: true
          };
        }
        
        // Additional verification steps
        console.warn('⚠️ Could not verify signout through URL or session state, checking login page...');
        await page.screenshot({ path: 'after-signout.png' });
        
        // Check if we're on the login page as a fallback
        const isOnLoginPage = await page.evaluate(() => !!document.querySelector('input#txtID'));
        
        if (isOnLoginPage) {
          console.log('✅ Sign out successful - on login page');
          await cleanupBrowser(browser);
          return { 
            success: true, 
            message: 'Sign out completed successfully',
            onLoginPage: true
          };
        }
        
        // Final check for user elements
        const userElements = await page.evaluate(() => 
          document.querySelectorAll('p.user_name, .user-profile, .user-menu').length
        );
        
        if (userElements === 0) {
          console.log('✅ Sign out successful - no user elements found');
          await cleanupBrowser(browser);
          return { 
            success: true, 
            message: 'Sign out completed successfully',
            noUserElements: true
          };
        }
        
        throw new Error('Could not verify successful signout');
        
      } catch (navError) {
        console.warn('⚠️ Navigation timeout, checking current state...');
        await page.screenshot({ path: 'after-signout.png' });
        
        // Check if we're already on the login page
        const isOnLoginPage = await page.evaluate(() => !!document.querySelector('input#txtID'));
        
        if (isOnLoginPage) {
          console.log('✅ Sign out successful - on login page');
          await cleanupBrowser(browser);
          return { success: true, message: 'Sign out completed successfully' };
        }
        
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
      if (browser) await cleanupBrowser(browser);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return { success: false, message: 'Unexpected error in sign out process' };
}

// Export the function
module.exports.signOutAdrenalin = signOutAdrenalin;
