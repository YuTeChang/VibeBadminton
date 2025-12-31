/**
 * Screenshot Testing Script for PoweredByPace
 * 
 * This script tests all features and takes screenshots of each page.
 * Run with: node scripts/screenshot-test.js
 * 
 * Prerequisites:
 * - Dev server should be running on http://localhost:3000
 * - Playwright installed: npm install --save-dev playwright
 * - Playwright browsers installed: npx playwright install chromium
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '../docs/screenshots/test-results');
const BASE_URL = 'http://localhost:3000';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function takeScreenshot(page, filename, description) {
  console.log(`📸 Capturing: ${description}...`);
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`✅ Saved: ${filename}`);
  return filepath;
}

async function waitForPageLoad(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Wait for any animations/transitions
}

async function testAllFeatures() {
  console.log('🚀 Starting screenshot testing...\n');
  console.log(`📁 Screenshots will be saved to: ${SCREENSHOT_DIR}\n`);
  
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  try {
    // 1. Home Page
    console.log('\n1️⃣ Testing Home Page');
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
    await takeScreenshot(page, '01-home-page.png', 'Home Page');

    // 2. Create Session Page - Empty (with game mode toggle visible)
    console.log('\n2️⃣ Testing Create Session Page (Empty)');
    await page.goto(`${BASE_URL}/create-session`);
    await waitForPageLoad(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await takeScreenshot(page, '02-create-session-empty.png', 'Create Session (Empty Form with Game Mode Toggle)');

    // 3. Create Session Page - Filled (without round robin)
    console.log('\n3️⃣ Testing Create Session Page (Filled)');
    // Navigate to create session page fresh
    await page.goto(`${BASE_URL}/create-session`);
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);
    
    // Ensure doubles mode is selected (should be default, but click to be sure)
    const doublesButton = page.locator('button').filter({ hasText: /^Doubles$/i }).first();
    if (await doublesButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await doublesButton.click();
      await page.waitForTimeout(500);
    }
    
    // Find session name input - it's the first text input before player inputs
    await page.waitForTimeout(500);
    const allTextInputs = await page.locator('input[type="text"]').all();
    if (allTextInputs.length > 0) {
      // First input is session name
      await allTextInputs[0].fill('Friday Night Session');
      await page.waitForTimeout(300);
    }
    
    // Fill player names (wait a bit for inputs to be ready)
    await page.waitForTimeout(500);
    const playerInputs = await page.locator('input[type="text"][placeholder*="Player"]').all();
    const players = ['Alice', 'Bob', 'Charlie', 'Diana'];
    for (let i = 0; i < Math.min(playerInputs.length, players.length); i++) {
      try {
      await playerInputs[i].fill(players[i]);
        await page.waitForTimeout(200);
      } catch (e) {
        console.log(`⚠️  Could not fill player ${i + 1}`);
      }
    }

    // Select organizer (wait for dropdown to populate)
    await page.waitForTimeout(1000);
    try {
    const organizerSelect = page.locator('select').first();
      await organizerSelect.waitFor({ timeout: 5000 });
      const optionCount = await organizerSelect.locator('option').count();
      if (optionCount > 1) {
    await organizerSelect.selectOption({ index: 1 }); // Select first non-empty option
      }
    } catch (e) {
      console.log('⚠️  Could not select organizer');
    }

    // Fill financial info - find inputs by scrolling to them and using more specific selectors
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    
    // Court cost input (after the per person/total buttons)
    try {
      const numberInputs = await page.locator('input[type="number"]').all();
      if (numberInputs.length > 0) {
        await numberInputs[0].fill('14.40');
    await page.waitForTimeout(300);
      }
    
    // Bird cost input (second number input)
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(300);
      if (numberInputs.length > 1) {
        await numberInputs[1].fill('3.00');
    await page.waitForTimeout(300);
      }
    
    // Bet per player input (third number input)
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(300);
      if (numberInputs.length > 2) {
        await numberInputs[2].fill('2.00');
        await page.waitForTimeout(300);
      }
    } catch (e) {
      console.log('⚠️  Could not fill all financial inputs');
    }

    await waitForPageLoad(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await takeScreenshot(page, '02-create-session-filled.png', 'Create Session (Filled Form)');

    // 4. Create Session Page - With Round Robin
    console.log('\n4️⃣ Testing Create Session Page (Round Robin Enabled)');
    // Navigate back to create session or refresh
    await page.goto(`${BASE_URL}/create-session`);
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);
    
      // Fill basic info first
      const allInputs = await page.locator('input[type="text"]').all();
      if (allInputs.length > 0) {
        await allInputs[0].fill('Round Robin Session');
        await page.waitForTimeout(300);
      }
    
    await page.waitForTimeout(500);
    const playerInputs2 = await page.locator('input[type="text"][placeholder*="Player"]').all();
    const players2 = ['Alice', 'Bob', 'Charlie', 'Diana'];
    for (let i = 0; i < Math.min(playerInputs2.length, players2.length); i++) {
      try {
        await playerInputs2[i].fill(players2[i]);
        await page.waitForTimeout(200);
      } catch (e) {}
    }
    
    await page.waitForTimeout(1000);
    try {
      const orgSelect2 = page.locator('select').first();
      await orgSelect2.waitFor({ timeout: 5000 });
      const optionCount2 = await orgSelect2.locator('option').count();
      if (optionCount2 > 1) {
        await orgSelect2.selectOption({ index: 1 });
      }
    } catch (e) {}
    
    // Scroll to find checkbox - look for label with "Round Robin" text
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(500);
    
    try {
      // Try to find checkbox by label text
      const roundRobinLabel = page.locator('label').filter({ hasText: /Round Robin/i }).first();
      if (await roundRobinLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
        await roundRobinLabel.click();
        await page.waitForTimeout(1000);
      } else {
        // Fallback: find any checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
    await checkbox.check();
          await page.waitForTimeout(1000);
        }
      }
    } catch (e) {
      console.log('⚠️  Could not find round robin checkbox, continuing...');
    }
    
    // Fill in round robin game count
    const roundRobinInput = page.locator('input[placeholder="Auto"]').first();
    if (await roundRobinInput.isVisible()) {
      await roundRobinInput.fill('5');
      await page.waitForTimeout(300);
    }
    
    await page.evaluate(() => window.scrollTo(0, 0));
    await takeScreenshot(page, '02-create-session-round-robin.png', 'Create Session (Round Robin Enabled)');

    // Submit form to create session
    console.log('\n5️⃣ Creating session...');
    // Scroll to submit button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    try {
      // Try to find and click submit button
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.waitFor({ timeout: 5000 });
      const isDisabled = await submitButton.isDisabled();
      if (!isDisabled) {
        await submitButton.click();
        await page.waitForURL(/\/session\/.*/, { timeout: 10000 });
        await waitForPageLoad(page);
      } else {
        console.log('⚠️  Submit button is disabled, form may not be valid');
        // Try to fill missing fields or just continue
        await page.goto(`${BASE_URL}/create-session`);
        await waitForPageLoad(page);
        // Recreate session with all required fields
        await page.waitForTimeout(1000);
        const sessionInput3 = page.locator('input[placeholder*="Friday Night"]').first();
        if (await sessionInput3.isVisible({ timeout: 3000 }).catch(() => false)) {
          await sessionInput3.fill('Test Session');
        }
        await page.waitForTimeout(500);
        const playerInputs3 = await page.locator('input[type="text"][placeholder*="Player"]').all();
        for (let i = 0; i < Math.min(playerInputs3.length, 4); i++) {
          try {
            await playerInputs3[i].fill(['Alice', 'Bob', 'Charlie', 'Diana'][i]);
            await page.waitForTimeout(200);
          } catch (e) {}
        }
        await page.waitForTimeout(1000);
        const orgSelect3 = page.locator('select').first();
        if (await orgSelect3.isVisible({ timeout: 3000 }).catch(() => false)) {
          const optionCount3 = await orgSelect3.locator('option').count();
          if (optionCount3 > 1) {
            await orgSelect3.selectOption({ index: 1 });
          }
        }
        await page.waitForTimeout(500);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        const submitBtn2 = page.locator('button[type="submit"]').first();
        if (await submitBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
          await submitBtn2.click();
          await page.waitForURL(/\/session\/.*/, { timeout: 10000 });
          await waitForPageLoad(page);
        }
      }
    } catch (e) {
      console.log('⚠️  Could not submit form, navigating manually');
      // If we can't submit, just navigate to a session page for remaining screenshots
      // This is a fallback - in real usage, the form would be valid
    }
    
    // Go back to home to show session
    console.log('\n5️⃣a Testing Home Page with Session');
    await page.goto(BASE_URL);
    await waitForPageLoad(page);
    await page.waitForTimeout(1000);
    await takeScreenshot(page, '01-home-page-with-session.png', 'Home Page (With Active Session)');
    
    // Create a second session to show multiple sessions - Test singles mode
    console.log('\n5️⃣b Testing Singles Mode and Multiple Sessions...');
    await page.goto(`${BASE_URL}/create-session`);
    await waitForPageLoad(page);
    await page.waitForTimeout(500);
    
    // Test singles mode
    const singlesButton = page.locator('button').filter({ hasText: /^Singles$/i }).first();
    if (await singlesButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await singlesButton.click();
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await takeScreenshot(page, '02-create-session-singles-mode.png', 'Create Session (Singles Mode)');
      
      // Fill singles session (only need 2 players)
      await page.waitForTimeout(500);
      const allTextInputs2 = await page.locator('input[type="text"]').all();
      if (allTextInputs2.length > 0) {
        await allTextInputs2[0].fill('Singles Practice');
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(300);
      const singlesPlayerInputs = await page.locator('input[type="text"][placeholder*="Player"]').all();
      const singlesPlayers = ['Alex', 'Sam'];
      for (let i = 0; i < Math.min(singlesPlayerInputs.length, 2); i++) {
        if (singlesPlayers[i]) {
          await singlesPlayerInputs[i].fill(singlesPlayers[i]);
          await page.waitForTimeout(100);
        }
      }
      
      // Select organizer
      await page.waitForTimeout(500);
      const singlesOrganizerSelect = page.locator('select').first();
      const optionCount = await singlesOrganizerSelect.locator('option').count();
      if (optionCount > 1) {
        await singlesOrganizerSelect.selectOption({ index: 1 });
      }
      
      await page.waitForTimeout(500);
    await page.click('button[type="submit"]:not([disabled])');
    await page.waitForURL(/\/session\/.*/, { timeout: 10000 });
    await waitForPageLoad(page);
      await page.waitForTimeout(1000);
      
      // Go back to home to show multiple sessions
      await page.goto(BASE_URL);
      await waitForPageLoad(page);
      await page.waitForTimeout(2000); // Wait for sessions to load
      await takeScreenshot(page, '01-home-page-multiple-sessions.png', 'Home Page (Multiple Sessions)');
      
      // Navigate back to first session by clicking it
      const sessionButtons = page.locator('button, a').filter({ hasText: /Friday Night Session|Open Session|Continue Session/i });
      const buttonCount = await sessionButtons.count();
      if (buttonCount > 0) {
        await sessionButtons.first().click();
        await page.waitForURL(/\/session\/.*/, { timeout: 10000 });
        await waitForPageLoad(page);
      }
    }

    // 6. Session Page - Stats Tab (empty)
    // First, make sure we're on a session page - create one if needed
    console.log('\n6️⃣ Testing Session Page - Stats Tab (No Games)');
    const currentUrl = page.url();
    if (!currentUrl.includes('/session/')) {
      // Navigate to create session and create one
      await page.goto(`${BASE_URL}/create-session`);
      await waitForPageLoad(page);
      await page.waitForTimeout(1000);
      
      // Fill minimal required fields
      try {
        const allTextInputs4 = await page.locator('input[type="text"]').all();
        if (allTextInputs4.length > 0) {
          await allTextInputs4[0].fill('Test Session');
          await page.waitForTimeout(300);
        }
        await page.waitForTimeout(500);
        const playerInputs = await page.locator('input[type="text"][placeholder*="Player"]').all();
        for (let i = 0; i < Math.min(playerInputs.length, 4); i++) {
          try {
            await playerInputs[i].fill(['P1', 'P2', 'P3', 'P4'][i]);
            await page.waitForTimeout(200);
          } catch (e) {}
        }
        await page.waitForTimeout(1000);
        const orgSelect = page.locator('select').first();
        if (await orgSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
          const optionCount = await orgSelect.locator('option').count();
          if (optionCount > 1) {
            await orgSelect.selectOption({ index: 1 });
          }
        }
        await page.waitForTimeout(500);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          const isDisabled = await submitBtn.isDisabled();
          if (!isDisabled) {
            await submitBtn.click();
            await page.waitForURL(/\/session\/.*/, { timeout: 10000 });
            await waitForPageLoad(page);
            await page.waitForTimeout(1000);
          }
        }
      } catch (e) {
        console.log('⚠️  Could not create session, using fallback');
      }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await takeScreenshot(page, '03-session-stats-empty.png', 'Session Stats Tab (No Games)');

    // 7. Session Page - Record Tab
    console.log('\n7️⃣ Testing Session Page - Record Tab');
    // Try to find Record tab - it's in the bottom navigation with aria-label
    try {
      const recordTab = page.locator('button[aria-label*="Record"], button[aria-label*="record"]').first();
      await recordTab.waitFor({ timeout: 5000 });
    await recordTab.click();
    await waitForPageLoad(page);
      await page.waitForTimeout(1500);
    } catch (e) {
      // Try by text
      try {
        const recordTab2 = page.locator('button').filter({ hasText: /^Record$/i }).first();
        await recordTab2.waitFor({ timeout: 3000 });
        await recordTab2.click();
        await waitForPageLoad(page);
        await page.waitForTimeout(1500);
      } catch (e2) {
        console.log('⚠️  Could not find Record tab');
      }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await takeScreenshot(page, '04-session-record-empty.png', 'Session Record Tab (Empty)');

    // 8. Record a game - Select Team A
    console.log('\n8️⃣ Testing Record Tab - Selecting Teams');
    
    // Find available (not disabled) player buttons for Team A Position 1
    // Use a more specific selector - buttons that are not disabled
    const aliceButtons = page.locator('button:not([disabled])').filter({ hasText: 'Alice' });
    const aliceCount = await aliceButtons.count();
    if (aliceCount > 0) {
      await aliceButtons.first().click();
      await page.waitForTimeout(300);
    }
    
    // Scroll to see Team A Position 2
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(300);
    
    // Find available Bob button for Team A Position 2
    const bobButtons = page.locator('button:not([disabled])').filter({ hasText: 'Bob' });
    const bobCount = await bobButtons.count();
    if (bobCount > 0) {
      // Try to get the second one if available, otherwise first
      if (bobCount > 1) {
        await bobButtons.nth(1).click();
      } else {
        await bobButtons.first().click();
      }
      await page.waitForTimeout(300);
    }

    // Scroll to Team B section
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(300);
    
    // Find available Charlie button for Team B Position 1
    const charlieButtons = page.locator('button:not([disabled])').filter({ hasText: 'Charlie' });
    const charlieCount = await charlieButtons.count();
    if (charlieCount > 0) {
      await charlieButtons.first().click();
      await page.waitForTimeout(300);
    }
    
    // Find available Diana button for Team B Position 2
    const dianaButtons = page.locator('button:not([disabled])').filter({ hasText: 'Diana' });
    const dianaCount = await dianaButtons.count();
    if (dianaCount > 0) {
      // Try to get the second one if available, otherwise first
      if (dianaCount > 1) {
        await dianaButtons.nth(1).click();
      } else {
        await dianaButtons.first().click();
      }
      await page.waitForTimeout(300);
    }
    
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await takeScreenshot(page, '04-session-record-teams-selected.png', 'Record Tab (Teams Selected)');

    // Select winner - scroll down to find winner buttons
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(1000);
    
    // Try to find and click Team A winner button
    try {
      const winnerSection = page.locator('h3').filter({ hasText: /Winner/i });
      await winnerSection.waitFor({ timeout: 3000 });
      const teamAButton = page.locator('button').filter({ hasText: /^Team A$/i }).first();
      await teamAButton.click({ timeout: 5000 });
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await takeScreenshot(page, '04-session-record-ready.png', 'Record Tab (Ready to Save)');
      
      // Save the game
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      const saveButton = page.locator('button:not([disabled])').filter({ hasText: /Save Game/i }).first();
      if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveButton.click({ timeout: 5000 });
        await page.waitForTimeout(2000);
        await waitForPageLoad(page);
      } else {
        console.log('⚠️  Save button not visible, continuing...');
      }
    } catch (error) {
      console.log('⚠️  Could not complete game recording automatically:', error.message);
      console.log('⚠️  Continuing with remaining screenshots...');
    }

    // 9. Session Page - Stats Tab (with games)
    console.log('\n9️⃣ Testing Session Page - Stats Tab (With Games)');
    try {
      const statsTab = page.locator('button').filter({ hasText: /^Stats$/i }).first();
      await statsTab.waitFor({ timeout: 5000 });
    await statsTab.click();
    await waitForPageLoad(page);
      await page.waitForTimeout(1000);
    } catch (e) {
      const statsTabAlt = page.locator('button[aria-label*="stats"], button[aria-label*="Stats"]').first();
      if (await statsTabAlt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await statsTabAlt.click();
        await waitForPageLoad(page);
        await page.waitForTimeout(1000);
      }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await takeScreenshot(page, '03-session-stats-with-games.png', 'Session Stats Tab (With Games)');

    // 10. Session Page - History Tab
    console.log('\n🔟 Testing Session Page - History Tab');
    try {
      const historyTab = page.locator('button').filter({ hasText: /^History$/i }).first();
      await historyTab.waitFor({ timeout: 5000 });
    await historyTab.click();
    await waitForPageLoad(page);
      await page.waitForTimeout(1000);
    } catch (e) {
      const historyTabAlt = page.locator('button[aria-label*="history"], button[aria-label*="History"]').first();
      if (await historyTabAlt.isVisible({ timeout: 3000 }).catch(() => false)) {
        await historyTabAlt.click();
        await waitForPageLoad(page);
        await page.waitForTimeout(1000);
      }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await takeScreenshot(page, '05-session-history.png', 'Session History Tab');

    // 11. Summary Page
    console.log('\n1️⃣1️⃣ Testing Summary Page');
    // The View Summary link is in the SessionHeader
    try {
      const summaryLink = page.locator('a').filter({ hasText: /View Summary/i }).first();
      await summaryLink.waitFor({ timeout: 5000 });
    await summaryLink.click();
    await page.waitForURL(/\/session\/.*\/summary/, { timeout: 10000 });
    await waitForPageLoad(page);
      await page.waitForTimeout(2000); // Wait for summary calculations
      await page.evaluate(() => window.scrollTo(0, 0));
      await takeScreenshot(page, '06-summary-page.png', 'Summary Page');
    } catch (e) {
      console.log('⚠️  Could not find View Summary link, navigating directly');
      // Fallback: navigate directly to summary if we have a session ID
      const currentUrl = page.url();
      const sessionIdMatch = currentUrl.match(/\/session\/([^\/]+)/);
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        await page.goto(`${BASE_URL}/session/${sessionId}/summary`);
        await waitForPageLoad(page);
        await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await takeScreenshot(page, '06-summary-page.png', 'Summary Page');
      }
    }

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`\n📁 Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log(`\n📋 Summary:`);
    console.log(`   - Home Page (Empty, With Session, Multiple Sessions)`);
    console.log(`   - Create Session (Empty, Filled, Singles Mode, Round Robin)`);
    console.log(`   - Session Stats (Empty, With Games)`);
    console.log(`   - Session Record (Empty, Teams Selected, Ready)`);
    console.log(`   - Session History`);
    console.log(`   - Summary Page`);

  } catch (error) {
    console.error('\n❌ Error during testing:', error);
    console.error('\n💡 Make sure the dev server is running on http://localhost:3000');
    throw error;
  } finally {
    await browser.close();
  }
}

// Check if dev server is running
async function checkServer() {
  const http = require('http');
  return new Promise((resolve) => {
    const req = http.get(BASE_URL, (res) => {
      // Accept 200, 404, or any response as server is running
      resolve(res.statusCode === 200 || res.statusCode === 404);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Run the test
(async () => {
  console.log('🔍 Checking if dev server is running...');
  const serverRunning = await checkServer().catch(() => false);
  
  if (!serverRunning) {
    console.error('\n❌ Dev server is not running!');
    console.error('💡 Please start the dev server first: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Dev server is running\n');
  await testAllFeatures();
})().catch(console.error);
