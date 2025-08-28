const puppeteer = require('puppeteer');
const config = require('./config');

// Utility function to safely close browser
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

// Utility function to safely click an element
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

// Sign In functionality
async function signInAdrenalin() {
  let browser;
  let page;
  const maxRetries = 2;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log('\n=== Starting Sign In Process ===');
      
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
      await page.waitForFunction(() => {
        return document.readyState === 'complete' && 
               document.querySelector('html')?.style.opacity === '1';
      }, { 
        timeout: config.TIMEOUTS?.PAGE_LOAD || 30000 
      });

      // Set company field if it exists
      const company = config.COMPANY;
      if (company) {
        await page.evaluate((company) => {
          const companyField = document.getElementById('hdnCompanyName');
          if (companyField) {
            companyField.value = company;
          }
        }, company);
      }

      // Fill in login credentials
      console.log('🔑 Filling in login credentials...');
      await page.type('#txtID', config.USERNAME || '');
      await page.type('#txtPassword', config.PASSWORD || '');

      // Click login button
      console.log('🚀 Clicking login button...');
      await safeClick(page, '#btnLogin', 'Login Button');

      // Wait for navigation after login
      try {
        await page.waitForNavigation({
          waitUntil: 'networkidle0',
          timeout: config.TIMEOUTS?.PAGE_LOAD || 60000
        });

        // Verify successful login by checking for elements that indicate a successful login
        const isLoginSuccessful = await page.evaluate(() => {
          return !!document.querySelector('.user-profile') || 
                 !!document.querySelector('.logout-button') ||
                 !document.querySelector('.login-error-message');
        });

        if (isLoginSuccessful) {
          console.log('✅ Successfully logged in');
          return { success: true, message: 'Login successful' };
        } else {
          throw new Error('Login failed - could not verify successful login');
        }
      } catch (error) {
        console.error('❌ Login error:', error.message);
        throw error;
      }
    } catch (error) {
      retryCount++;
      console.error(`❌ Attempt ${retryCount} failed:`, error.message);
      
      if (retryCount >= maxRetries) {
        console.error('❌ Max retries reached. Giving up.');
        throw error;
      }
      
      console.log(`🔄 Retrying... (${retryCount}/${maxRetries})`);
      
      // Clean up before retry
      if (browser) {
        await cleanupBrowser(browser);
        browser = null;
      }
    }
  }
  
  return { success: false, message: 'Failed to sign in after multiple attempts' };
}

// Export the function
module.exports = { signInAdrenalin };
