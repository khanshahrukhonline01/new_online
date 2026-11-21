import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function measureCondition(label, options = {}) {
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1280, height: 800 },
    hasTouch: options.hasTouch || false,
    reducedMotion: options.reducedMotion || 'no-preference',
  });
  const page = await context.newPage();

  // Pre-seed statutory consent
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'khelgrid_user_policy_consent_v1',
      JSON.stringify({
        accepted: true,
        version: '2026.1',
        timestamp: new Date().toISOString(),
        preferences: { essential: true, locationDiscovery: true, realtimeAlerts: true },
      })
    );
  });

  await page.goto('http://localhost:3000/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  // Setup performance observers in page context
  await page.evaluate(() => {
    window.__perfData = {
      fpsSamples: [],
      layoutShifts: [],
      longTasks: [],
      rafCallCount: 0,
      activeRafAtRest: 0,
    };

    // Layout shift observer
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__perfData.layoutShifts.push(entry.value);
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {}

    // Long task observer
    try {
      const ltObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__perfData.longTasks.push({
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      });
      ltObserver.observe({ type: 'longtask', buffered: true });
    } catch {}

    // RAF FPS monitor
    let lastTime = performance.now();
    let frameCount = 0;
    function monitorFps(now) {
      window.__perfData.rafCallCount++;
      const delta = now - lastTime;
      frameCount++;
      if (delta >= 1000) {
        const fps = Math.round((frameCount * 1000) / delta);
        window.__perfData.fpsSamples.push(fps);
        frameCount = 0;
        lastTime = now;
      }
      requestAnimationFrame(monitorFps);
    }
    requestAnimationFrame(monitorFps);
  });

  // Execute motion profile:
  // Phase 1: Fast sweep (diagonal across viewport)
  for (let i = 0; i <= 30; i++) {
    await page.mouse.move(100 + i * 30, 100 + i * 20);
    await page.waitForTimeout(16);
  }

  // Phase 2: Circular movement (orbital tracking)
  const centerX = 500, centerY = 400, radius = 150;
  for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    await page.mouse.move(x, y);
    await page.waitForTimeout(16);
  }

  // Phase 3: Slow precision movement across interactive cards
  for (let x = 200; x <= 600; x += 15) {
    await page.mouse.move(x, 350);
    await page.waitForTimeout(20);
  }

  // Phase 4: Stationary pause (1.5 seconds) to test idle loop sleep
  await page.waitForTimeout(1500);

  // Measure performance summary from browser
  const metrics = await page.evaluate(() => {
    const cls = window.__perfData.layoutShifts.reduce((acc, v) => acc + v, 0);
    const avgFps = window.__perfData.fpsSamples.length
      ? Math.round(window.__perfData.fpsSamples.reduce((a, b) => a + b, 0) / window.__perfData.fpsSamples.length)
      : 60;
    const longTaskCount = window.__perfData.longTasks.length;
    const maxLongTask = window.__perfData.longTasks.length
      ? Math.round(Math.max(...window.__perfData.longTasks.map(t => t.duration)))
      : 0;

    // Check if cursor element is in DOM
    const cursor = document.querySelector('[data-testid="kg-custom-cursor"]');
    const isMounted = Boolean(cursor);
    const particleCount = cursor ? cursor.querySelectorAll('.kg-cursor-trail-particle').length : 0;

    return {
      cls,
      avgFps,
      longTaskCount,
      maxLongTask,
      isMounted,
      particleCount,
    };
  });

  await browser.close();
  return { label, ...metrics };
}

async function run() {
  console.log('=== KHELGRID CURSOR PERFORMANCE EVALUATION ===\n');

  const conditions = [
    { label: '1. Desktop (Cursor Disabled / Reduced Motion)', options: { reducedMotion: 'reduce' } },
    { label: '2. Desktop (Baseline Cursor - Prior to Particle Trail)', options: {} },
    { label: '3. Mobile Emulation (Touch Only)', options: { hasTouch: true, viewport: { width: 390, height: 844 } } },
  ];

  const results = [];
  for (const c of conditions) {
    console.log(`Evaluating condition: ${c.label}...`);
    const r = await measureCondition(c.label, c.options);
    results.push(r);
    console.log(`  -> FPS: ${r.avgFps}, CLS: ${r.cls.toFixed(4)}, LongTasks: ${r.longTaskCount}, Mounted: ${r.isMounted}`);
  }

  console.log('\n=== BASELINE METRICS SUMMARY ===');
  console.table(results);

  fs.writeFileSync('scripts/cursor-performance-baseline.json', JSON.stringify(results, null, 2));
  console.log('Saved baseline data to scripts/cursor-performance-baseline.json');
}

run().catch(console.error);
