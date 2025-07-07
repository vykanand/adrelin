// Debug script to inspect page elements
const puppeteer = require('puppeteer');

// Configuration
const URL = 'https://pureconnect.myadrenalin.com/AdrenalinMax/#/';
const LAUNCH_OPTIONS = {
  headless: false,
  devtools: true,
  slowMo: 100,
  args: [
    '--start-maximized',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ]
};

async function debugLoginPage() {
  const browser = await puppeteer.launch(LAUNCH_OPTIONS);
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 720 });
  console.log(`🌐 Navigating to: ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for page to load
  await page.waitForTimeout(5000);

  // Debug information
  console.log('\n=== Page Debug Information ===\n');

  // Get all input elements
  const inputs = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    return inputs.map(input => ({
      type: input.type,
      name: input.name,
      id: input.id,
      placeholder: input.placeholder,
      className: input.className,
      value: input.value
    }));
  });
  
  console.log('📋 All input elements found:', JSON.stringify(inputs, null, 2));
  
  // Get all buttons
  const buttons = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
    return buttons.map(btn => ({
      tagName: btn.tagName,
      type: btn.type,
      value: btn.value,
      textContent: btn.textContent?.trim(),
      className: btn.className,
      id: btn.id,
      name: btn.name
    }));
  });
  
  console.log('📋 All buttons found:', JSON.stringify(buttons, null, 2));
  
  // Get page HTML structure (first 1000 chars)
  const pageHTML = await page.content();
  console.log('📋 Page HTML (first 1000 chars):');
  console.log(pageHTML.substring(0, 1000));
  
  // Wait for manual inspection
  console.log('👀 Browser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
}

debugLoginPage().catch(console.error);