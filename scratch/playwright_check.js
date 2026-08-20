const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Go to localhost homepage
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Take screenshot so I can check
  await page.screenshot({ path: 'scratch/homepage.png', fullPage: true });

  // Get all text content
  const content = await page.evaluate(() => document.body.innerText);
  console.log("----- PAGE TEXT CONTENT -----");
  console.log(content);
  
  await browser.close();
})();
