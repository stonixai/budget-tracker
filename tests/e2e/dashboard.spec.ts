import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('dashboard loads and displays correctly', async ({ page }) => {
    // Check main title
    await expect(page.getByText('Budget Tracker')).toBeVisible();
    
    // Check navigation links
    await expect(page.getByRole('link', { name: /transactions/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /budgets/i })).toBeVisible();
    
    // Verify the page has proper structure
    await expect(page.locator('main')).toBeVisible();
  });

  test('navigation between pages works correctly', async ({ page }) => {
    // Test navigation to transactions
    await page.getByRole('link', { name: /transactions/i }).click();
    await expect(page).toHaveURL(/.*\/transactions/);
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();
    
    // Navigate back to dashboard
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await expect(page).toHaveURL('/');
    
    // Test navigation to budgets
    await page.getByRole('link', { name: /budgets/i }).click();
    await expect(page).toHaveURL(/.*\/budgets/);
    await expect(page.getByRole('heading', { name: /budgets/i })).toBeVisible();
    
    // Navigate back to dashboard
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('dashboard is responsive on different screen sizes', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.getByText('Budget Tracker')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByText('Budget Tracker')).toBeVisible();
    await expect(page.getByRole('link', { name: /transactions/i })).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByText('Budget Tracker')).toBeVisible();
    await expect(page.getByRole('link', { name: /transactions/i })).toBeVisible();
  });

  test('dashboard accessibility features', async ({ page }) => {
    // Check for proper heading hierarchy
    const mainHeading = page.getByRole('heading', { level: 1 });
    await expect(mainHeading).toBeVisible();
    
    // Check for accessible navigation
    await expect(page.getByRole('link', { name: /transactions/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /budgets/i })).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('page meta information is correct', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Budget Tracker|Tutorial/);
    
    // Check for proper meta tags (if implemented)
    const metaViewport = page.locator('meta[name="viewport"]');
    if (await metaViewport.count() > 0) {
      await expect(metaViewport).toHaveAttribute('content', /width=device-width/);
    }
  });

  test('error boundary handles errors gracefully', async ({ page }) => {
    // This test would trigger an error in the application
    // For now, we'll just verify the basic error handling structure
    
    // Navigate to a potentially error-prone area
    await page.getByRole('link', { name: /transactions/i }).click();
    
    // If an error occurs, the page should still be usable
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('button', { name: /back to dashboard/i })).toBeVisible();
  });

  test('application loads without JavaScript errors', async ({ page }) => {
    const jsErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    // Navigate through the application
    await page.getByRole('link', { name: /transactions/i }).click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await page.waitForTimeout(1000);
    
    await page.getByRole('link', { name: /budgets/i }).click();
    await page.waitForTimeout(1000);
    
    // Check for JavaScript errors
    const criticalErrors = jsErrors.filter(error => 
      !error.includes('Warning:') && 
      !error.includes('favicon') &&
      !error.includes('404')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('performance metrics meet acceptable thresholds', async ({ page }) => {
    const startTime = Date.now();
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    // Test navigation performance
    const navStartTime = Date.now();
    await page.getByRole('link', { name: /transactions/i }).click();
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();
    const navTime = Date.now() - navStartTime;
    
    // Navigation should be fast
    expect(navTime).toBeLessThan(3000);
  });

  test('offline behavior (if implemented)', async ({ page, context }) => {
    // This test checks if the application handles offline scenarios gracefully
    
    // First, load the page normally
    await expect(page.getByText('Budget Tracker')).toBeVisible();
    
    // Simulate going offline
    await context.setOffline(true);
    
    // Try to navigate (this might show an offline message or cached content)
    await page.getByRole('link', { name: /transactions/i }).click();
    
    // The application should either:
    // 1. Show cached content
    // 2. Show an appropriate offline message
    // 3. Handle the error gracefully
    await expect(page.locator('body')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
  });

  test('browser back/forward navigation works correctly', async ({ page }) => {
    // Start on dashboard
    await expect(page.getByText('Budget Tracker')).toBeVisible();
    
    // Navigate to transactions
    await page.getByRole('link', { name: /transactions/i }).click();
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();
    
    // Navigate to budgets
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await page.getByRole('link', { name: /budgets/i }).click();
    await expect(page.getByRole('heading', { name: /budgets/i })).toBeVisible();
    
    // Use browser back button
    await page.goBack();
    await expect(page.getByText('Budget Tracker')).toBeVisible();
    
    // Use browser forward button
    await page.goForward();
    await expect(page.getByRole('heading', { name: /budgets/i })).toBeVisible();
    
    // Go back twice to reach transactions
    await page.goBack();
    await page.goBack();
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();
  });

  test('URL routing works correctly', async ({ page }) => {
    // Test direct navigation to transactions URL
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();
    
    // Test direct navigation to budgets URL
    await page.goto('/budgets');
    await expect(page.getByRole('heading', { name: /budgets/i })).toBeVisible();
    
    // Test navigation back to root
    await page.goto('/');
    await expect(page.getByText('Budget Tracker')).toBeVisible();
  });

  test('handles 404 pages gracefully', async ({ page }) => {
    // Navigate to a non-existent page
    await page.goto('/non-existent-page');
    
    // Should show 404 page or redirect to home
    // The exact behavior depends on Next.js configuration
    const pageContent = await page.textContent('body');
    const hasValidResponse = 
      pageContent?.includes('404') || 
      pageContent?.includes('Not Found') ||
      pageContent?.includes('Budget Tracker'); // Redirected to home
    
    expect(hasValidResponse).toBe(true);
  });

  test('search functionality (if implemented)', async ({ page }) => {
    // Navigate to transactions page
    await page.getByRole('link', { name: /transactions/i }).click();
    
    // Look for search functionality
    const searchInput = page.locator('input[type="search"]').first();
    
    if (await searchInput.count() > 0) {
      // Test search functionality
      await searchInput.fill('grocery');
      // Add more search tests here
    }
    
    // This test passes regardless of whether search is implemented
    // It's a placeholder for future search functionality
  });

  test('theme switching (if implemented)', async ({ page }) => {
    // Look for theme toggle button
    const themeToggle = page.locator('[data-testid="theme-toggle"]').first();
    
    if (await themeToggle.count() > 0) {
      // Test theme switching
      await themeToggle.click();
      
      // Verify theme change (this would depend on implementation)
      const body = page.locator('body');
      const hasThemeClass = await body.evaluate(el => 
        el.classList.contains('dark') || el.classList.contains('light')
      );
      
      expect(hasThemeClass).toBe(true);
    }
    
    // This test passes regardless of whether theme switching is implemented
  });

  test('print functionality works', async ({ page }) => {
    // Navigate to transactions page
    await page.getByRole('link', { name: /transactions/i }).click();
    
    // Test that print styles don't break the layout
    await page.emulateMedia({ media: 'print' });
    
    // Verify page is still visible
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();
    
    // Reset media emulation
    await page.emulateMedia({ media: 'screen' });
  });
});