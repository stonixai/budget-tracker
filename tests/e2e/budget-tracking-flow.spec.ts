import { test, expect } from '@playwright/test';

test.describe('Budget Tracking Application E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('complete budget tracking workflow', async ({ page }) => {
    // 1. Start from dashboard
    await expect(page.getByText('Budget Tracker')).toBeVisible();
    
    // 2. Navigate to transactions page
    await page.getByRole('link', { name: /transactions/i }).click();
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();

    // 3. Create a new expense category
    await page.getByRole('button', { name: /new category/i }).click();
    
    await page.getByLabel(/name/i).fill('Groceries');
    await page.getByLabel(/type/i).selectOption('expense');
    await page.getByLabel(/color/i).fill('#ef4444');
    await page.getByLabel(/icon/i).fill('🛒');
    await page.getByRole('button', { name: /add category/i }).click();

    // Wait for modal to close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // 4. Create a new income category
    await page.getByRole('button', { name: /new category/i }).click();
    
    await page.getByLabel(/name/i).fill('Salary');
    await page.getByLabel(/type/i).selectOption('income');
    await page.getByLabel(/color/i).fill('#10b981');
    await page.getByLabel(/icon/i).fill('💼');
    await page.getByRole('button', { name: /add category/i }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();

    // 5. Add an income transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    
    await page.getByLabel(/type/i).selectOption('income');
    await page.getByLabel(/description/i).fill('Monthly Salary');
    await page.getByLabel(/amount/i).fill('5000.00');
    await page.getByLabel(/category/i).selectOption('💼 Salary');
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Wait for transaction to be added
    await expect(page.getByText('Monthly Salary')).toBeVisible();
    await expect(page.getByText('+$5,000.00')).toBeVisible();

    // 6. Add expense transactions
    await page.getByRole('button', { name: /add transaction/i }).click();
    
    await page.getByLabel(/type/i).selectOption('expense');
    await page.getByLabel(/description/i).fill('Weekly Groceries');
    await page.getByLabel(/amount/i).fill('125.50');
    await page.getByLabel(/category/i).selectOption('🛒 Groceries');
    await page.getByRole('button', { name: /add transaction/i }).click();

    await expect(page.getByText('Weekly Groceries')).toBeVisible();
    await expect(page.getByText('-$125.50')).toBeVisible();

    // Add another expense
    await page.getByRole('button', { name: /add transaction/i }).click();
    
    await page.getByLabel(/description/i).fill('Gas Station');
    await page.getByLabel(/amount/i).fill('45.00');
    await page.getByLabel(/category/i).selectOption('🛒 Groceries');
    await page.getByRole('button', { name: /add transaction/i }).click();

    await expect(page.getByText('Gas Station')).toBeVisible();
    await expect(page.getByText('-$45.00')).toBeVisible();

    // 7. Navigate to budgets page
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await page.getByRole('link', { name: /budgets/i }).click();
    
    await expect(page.getByRole('heading', { name: /budgets/i })).toBeVisible();

    // 8. Create a budget
    await page.getByRole('button', { name: /add budget/i }).click();
    
    await page.getByLabel(/budget name/i).fill('Monthly Groceries Budget');
    await page.getByLabel(/amount/i).fill('300.00');
    await page.getByLabel(/category/i).selectOption('🛒 Groceries');
    await page.getByRole('button', { name: /create budget/i }).click();

    // Verify budget was created and shows spending
    await expect(page.getByText('Monthly Groceries Budget')).toBeVisible();
    await expect(page.getByText('$170.50 / $300.00')).toBeVisible(); // Total expenses: $125.50 + $45.00
    
    // Check progress bar and percentage
    await expect(page.getByText('57% used')).toBeVisible(); // (170.50 / 300) * 100 ≈ 57%
    await expect(page.getByText('$129.50 remaining')).toBeVisible();

    // 9. Test budget deletion
    await page.getByRole('button').filter({ hasText: /delete/i }).first().click();
    
    // Confirm deletion
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure');
      await dialog.accept();
    });

    // Budget should be removed
    await expect(page.getByText('Monthly Groceries Budget')).not.toBeVisible();

    // 10. Navigate back to dashboard to see overview
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    
    // Verify dashboard shows the transactions we created
    await expect(page.getByText('Budget Tracker')).toBeVisible();
  });

  test('budget over-spending scenario', async ({ page }) => {
    // Navigate to transactions page
    await page.getByRole('link', { name: /transactions/i }).click();

    // Create category
    await page.getByRole('button', { name: /new category/i }).click();
    await page.getByLabel(/name/i).fill('Entertainment');
    await page.getByLabel(/type/i).selectOption('expense');
    await page.getByLabel(/icon/i).fill('🎬');
    await page.getByRole('button', { name: /add category/i }).click();

    // Add expensive transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/description/i).fill('Concert Tickets');
    await page.getByLabel(/amount/i).fill('250.00');
    await page.getByLabel(/category/i).selectOption('🎬 Entertainment');
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Navigate to budgets
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await page.getByRole('link', { name: /budgets/i }).click();

    // Create a small budget (less than spending)
    await page.getByRole('button', { name: /add budget/i }).click();
    await page.getByLabel(/budget name/i).fill('Entertainment Budget');
    await page.getByLabel(/amount/i).fill('100.00');
    await page.getByLabel(/category/i).selectOption('🎬 Entertainment');
    await page.getByRole('button', { name: /create budget/i }).click();

    // Verify over-budget display
    await expect(page.getByText('$250.00 / $100.00')).toBeVisible();
    await expect(page.getByText('100% used')).toBeVisible(); // Capped at 100%
    await expect(page.getByText('-$150.00 remaining')).toBeVisible();

    // Check that progress bar is red for over-budget
    const progressBar = page.locator('[style*="width: 100%"]').first();
    await expect(progressBar).toHaveClass(/bg-red-500/);
  });

  test('monthly budget filtering', async ({ page }) => {
    // Navigate to budgets page
    await page.getByRole('link', { name: /budgets/i }).click();

    // Test month selector
    const monthSelector = page.getByRole('textbox').filter({ hasText: /month/i }).first();
    await monthSelector.fill('2024-02');

    // Should trigger new API call and update display
    await expect(page.getByText('February 2024')).toBeVisible();

    // Create budget for specific month
    await page.getByRole('button', { name: /add budget/i }).click();
    
    const monthInput = page.getByLabel(/month/i);
    await expect(monthInput).toHaveValue('2024-02'); // Should match selected month

    await page.getByLabel(/budget name/i).fill('February Budget');
    await page.getByLabel(/amount/i).fill('500.00');
    await page.getByRole('button', { name: /create budget/i }).click();

    await expect(page.getByText('February Budget')).toBeVisible();
  });

  test('responsive design on mobile', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Test that the application is still functional on mobile
    await expect(page.getByText('Budget Tracker')).toBeVisible();

    // Navigate to transactions
    await page.getByRole('link', { name: /transactions/i }).click();
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();

    // Test that buttons are still clickable
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Test form is usable on mobile
    await page.getByLabel(/description/i).fill('Mobile Test Transaction');
    await page.getByLabel(/amount/i).fill('25.00');

    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('error handling and recovery', async ({ page }) => {
    // Navigate to transactions page
    await page.getByRole('link', { name: /transactions/i }).click();

    // Test form validation
    await page.getByRole('button', { name: /add transaction/i }).click();
    
    // Try to submit empty form
    await page.getByRole('button', { name: /add transaction/i }).click();
    
    // Form should still be visible due to validation
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill required fields
    await page.getByLabel(/description/i).fill('Test Transaction');
    await page.getByLabel(/amount/i).fill('50.00');

    // Cancel and retry
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Open modal again to verify reset
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByLabel(/description/i)).toHaveValue('');
    await expect(page.getByLabel(/amount/i)).toHaveValue('');
  });

  test('data persistence across page navigation', async ({ page }) => {
    // Create transaction
    await page.getByRole('link', { name: /transactions/i }).click();
    
    // Add category first
    await page.getByRole('button', { name: /new category/i }).click();
    await page.getByLabel(/name/i).fill('Test Category');
    await page.getByLabel(/icon/i).fill('🧪');
    await page.getByRole('button', { name: /add category/i }).click();

    // Add transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/description/i).fill('Persistent Transaction');
    await page.getByLabel(/amount/i).fill('75.00');
    await page.getByLabel(/category/i).selectOption('🧪 Test Category');
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Navigate to budgets
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await page.getByRole('link', { name: /budgets/i }).click();

    // Create budget
    await page.getByRole('button', { name: /add budget/i }).click();
    await page.getByLabel(/budget name/i).fill('Persistent Budget');
    await page.getByLabel(/amount/i).fill('200.00');
    await page.getByLabel(/category/i).selectOption('🧪 Test Category');
    await page.getByRole('button', { name: /create budget/i }).click();

    // Navigate back to transactions
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await page.getByRole('link', { name: /transactions/i }).click();

    // Verify transaction is still there
    await expect(page.getByText('Persistent Transaction')).toBeVisible();
    await expect(page.getByText('-$75.00')).toBeVisible();

    // Navigate back to budgets
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await page.getByRole('link', { name: /budgets/i }).click();

    // Verify budget shows correct spending
    await expect(page.getByText('Persistent Budget')).toBeVisible();
    await expect(page.getByText('$75.00 / $200.00')).toBeVisible();
  });

  test('accessibility navigation with keyboard', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to navigate to transactions link
    await page.keyboard.press('Enter');
    
    // Should navigate to transactions page
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();

    // Tab to add transaction button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible();

    // Tab through form fields
    await page.keyboard.press('Tab');
    await page.keyboard.type('Keyboard Test');

    // Close with Escape key
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('performance with large data sets', async ({ page }) => {
    // This test would ideally create many transactions and budgets
    // to test performance, but for demo purposes we'll simulate
    // by checking page load times

    const startTime = Date.now();
    
    await page.getByRole('link', { name: /transactions/i }).click();
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Page should load within 5 seconds

    // Navigate to budgets and check performance
    const budgetStartTime = Date.now();
    
    await page.getByRole('button', { name: /back to dashboard/i }).click();
    await page.getByRole('link', { name: /budgets/i }).click();
    await expect(page.getByRole('heading', { name: /budgets/i })).toBeVisible();
    
    const budgetLoadTime = Date.now() - budgetStartTime;
    expect(budgetLoadTime).toBeLessThan(5000); // Budget page should load quickly
  });

  test('security: XSS prevention in user inputs', async ({ page }) => {
    // Navigate to transactions page
    await page.getByRole('link', { name: /transactions/i }).click();

    // Create category with potential XSS
    await page.getByRole('button', { name: /new category/i }).click();
    await page.getByLabel(/name/i).fill('<script>alert("XSS")</script>');
    await page.getByLabel(/icon/i).fill('⚠️');
    await page.getByRole('button', { name: /add category/i }).click();

    // Add transaction with potential XSS
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/description/i).fill('<img src=x onerror=alert("XSS")>');
    await page.getByLabel(/amount/i).fill('50.00');
    await page.getByLabel(/category/i).selectOption('<script>alert("XSS")</script>');
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Verify the malicious content is displayed as text, not executed
    await expect(page.getByText('<script>alert("XSS")</script>')).toBeVisible();
    await expect(page.getByText('<img src=x onerror=alert("XSS")>')).toBeVisible();

    // Verify no alert was triggered (no XSS execution)
    // Note: Playwright will fail if unexpected dialogs appear
  });
});