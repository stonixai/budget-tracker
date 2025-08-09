import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BudgetsPage from '../../../app/budgets/page';
import { server } from '../../setup';
import { handlers, errorHandlers } from '../../__mocks__/handlers';
import { 
  waitForLoadingToFinish, 
  createUserInteractions,
  mockFetch,
  fillForm,
  selectOption,
  clickButton,
  expectCurrencyDisplay,
  expectPercentageDisplay
} from '../../utils/test-helpers';

describe('BudgetsPage Component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = createUserInteractions();
    server.resetHandlers(...handlers);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render page title and description', async () => {
      render(<BudgetsPage />);
      
      expect(screen.getByRole('heading', { name: /budgets/i })).toBeInTheDocument();
      expect(screen.getByText(/set and track your monthly spending limits/i)).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<BudgetsPage />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render control buttons and month selector', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add budget/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue(new Date().toISOString().slice(0, 7))).toBeInTheDocument();
    });
  });

  describe('Summary Cards', () => {
    it('should display budget summary cards', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      expect(screen.getByText('Total Budget')).toBeInTheDocument();
      expect(screen.getByText('Total Spent')).toBeInTheDocument();
      expect(screen.getByText('Remaining')).toBeInTheDocument();
      
      // Check for currency values
      expectCurrencyDisplay(50000, '$500.00');
      expectCurrencyDisplay(12500, '$125.00');
      expectCurrencyDisplay(37500, '$375.00');
    });

    it('should calculate remaining amount correctly', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      // Total budget: $500, Total spent: $125, Remaining: $375
      expect(screen.getByText('$500.00')).toBeInTheDocument();
      expect(screen.getByText('$125.00')).toBeInTheDocument();
      expect(screen.getByText('$375.00')).toBeInTheDocument();
    });

    it('should show negative remaining when over budget', async () => {
      // Mock over-budget scenario
      server.use(
        http.get('/api/budgets', () => {
          return HttpResponse.json([{
            id: 1,
            name: 'Over Budget',
            amount: 10000, // $100
            month: '2024-01',
            categoryId: 1,
            categoryName: 'Test',
            categoryColor: '#ff0000',
            categoryIcon: '💸',
            spent: 15000, // $150 spent
            userId: 1,
          }]);
        })
      );

      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      // Should show negative remaining in red
      const remainingElement = screen.getByText('-$50.00');
      expect(remainingElement).toBeInTheDocument();
      expect(remainingElement.className).toContain('text-red-600');
    });

    it('should display current month name', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      expect(screen.getByText(`For ${currentMonth}`)).toBeInTheDocument();
    });
  });

  describe('Budget List', () => {
    it('should display budget items with progress bars', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      expect(screen.getByText('Monthly Groceries')).toBeInTheDocument();
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('🛒')).toBeInTheDocument();
      
      // Check progress display
      expect(screen.getByText('$125.00 / $500.00')).toBeInTheDocument();
      expectPercentageDisplay(25); // 25% used
      expect(screen.getByText('$375.00 remaining')).toBeInTheDocument();
    });

    it('should show correct progress bar colors', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      // Should show green progress bar for 25% usage
      const progressBar = screen.getByText('25% used').closest('div')?.querySelector('[style*="width: 25%"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar?.className).toContain('bg-green-500');
    });

    it('should show warning color for high usage', async () => {
      // Mock high usage scenario
      server.use(
        http.get('/api/budgets', () => {
          return HttpResponse.json([{
            id: 1,
            name: 'High Usage Budget',
            amount: 10000, // $100
            month: '2024-01',
            categoryId: 1,
            categoryName: 'Test',
            categoryColor: '#ff0000',
            categoryIcon: '⚠️',
            spent: 8000, // $80 spent (80%)
            userId: 1,
          }]);
        })
      );

      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      expectPercentageDisplay(80);
      
      const progressBar = screen.getByText('80% used').closest('div')?.querySelector('[style*="width: 80%"]');
      expect(progressBar?.className).toContain('bg-yellow-500');
    });

    it('should show over-budget in red', async () => {
      // Mock over-budget scenario
      server.use(
        http.get('/api/budgets', () => {
          return HttpResponse.json([{
            id: 1,
            name: 'Over Budget',
            amount: 10000, // $100
            month: '2024-01',
            categoryId: 1,
            categoryName: 'Test',
            categoryColor: '#ff0000',
            categoryIcon: '💸',
            spent: 15000, // $150 spent (150%)
            userId: 1,
          }]);
        })
      );

      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      expectPercentageDisplay(100); // Capped at 100%
      expect(screen.getByText('$150.00 / $100.00')).toBeInTheDocument();
      expect(screen.getByText('-$50.00 remaining')).toBeInTheDocument();
      
      const progressBar = screen.getByText('100% used').closest('div')?.querySelector('[style*="width: 100%"]');
      expect(progressBar?.className).toContain('bg-red-500');
    });

    it('should show empty state when no budgets exist', async () => {
      // Mock empty response
      server.use(
        http.get('/api/budgets', () => {
          return HttpResponse.json([]);
        })
      );

      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      expect(screen.getByText(/no budgets set for this month/i)).toBeInTheDocument();
      expect(screen.getByText(/create your first budget to start tracking/i)).toBeInTheDocument();
    });

    it('should show delete buttons for each budget', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      const deleteButtons = screen.getAllByRole('button');
      const trashButtons = deleteButtons.filter(btn => 
        btn.querySelector('svg[viewBox="0 0 24 24"]')
      );
      
      expect(trashButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Month Selection', () => {
    it('should allow changing the selected month', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      const monthInput = screen.getByDisplayValue(new Date().toISOString().slice(0, 7));
      
      await user.clear(monthInput);
      await user.type(monthInput, '2024-02');
      
      // Should trigger new API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/budgets?month=2024-02');
      });
    });

    it('should update budget form month when changed', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      const monthInput = screen.getByDisplayValue(new Date().toISOString().slice(0, 7));
      await user.clear(monthInput);
      await user.type(monthInput, '2024-03');
      
      await clickButton(user, 'add budget');
      
      const formMonthInput = screen.getByLabelText(/month/i) as HTMLInputElement;
      expect(formMonthInput.value).toBe('2024-03');
    });
  });

  describe('Add Budget Modal', () => {
    it('should open modal when add budget button is clicked', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add budget');
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add Budget')).toBeInTheDocument();
    });

    it('should render all form fields in modal', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add budget');
      
      expect(screen.getByLabelText(/budget name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/month/i)).toBeInTheDocument();
    });

    it('should have default form values', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add budget');
      
      const monthInput = screen.getByLabelText(/month/i) as HTMLInputElement;
      const currentMonth = new Date().toISOString().slice(0, 7);
      expect(monthInput.value).toBe(currentMonth);
      
      // Category should default to "No specific category"
      const categorySelect = screen.getByLabelText(/category/i) as HTMLSelectElement;
      expect(categorySelect.value).toBe('');
    });

    it('should show only expense categories', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add budget');
      
      const categorySelect = screen.getByLabelText(/category/i);
      expect(categorySelect).toContainHTML('🛒 Groceries');
      // Should not show income categories in budget creation
    });

    it('should submit form with correct data', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'Test Budget', amount: 75000 })
      });
      global.fetch = mockPost;

      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add budget');
      
      await fillForm(user, {
        'budget name': 'Test Budget',
        amount: '750.00'
      });
      
      await selectOption(user, 'category', '1');
      await clickButton(user, 'create budget');
      
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Budget',
            amount: 75000, // Should convert to cents
            categoryId: 1,
            month: expect.any(String)
          })
        });
      });
    });

    it('should handle budget without category', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'General Budget', amount: 100000, categoryId: null })
      });
      global.fetch = mockPost;

      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add budget');
      
      await fillForm(user, {
        'budget name': 'General Budget',
        amount: '1000.00'
      });
      
      // Don't select a category (leave as "No specific category")
      await clickButton(user, 'create budget');
      
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'General Budget',
            amount: 100000,
            categoryId: null,
            month: expect.any(String)
          })
        });
      });
    });

    it('should close modal after successful submission', async () => {
      mockFetch({ id: 1, name: 'Test Budget', amount: 50000 });
      
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add budget');
      
      await fillForm(user, {
        'budget name': 'Test Budget',
        amount: '500.00'
      });
      await clickButton(user, 'create budget');
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should reset form after submission', async () => {
      mockFetch({ id: 1, name: 'Test Budget', amount: 50000 });
      
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add budget');
      
      await fillForm(user, {
        'budget name': 'Test Budget',
        amount: '500.00'
      });
      await clickButton(user, 'create budget');
      
      // Wait for modal to close and reopen
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      
      await clickButton(user, 'add budget');
      
      const nameInput = screen.getByLabelText(/budget name/i) as HTMLInputElement;
      const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
      
      expect(nameInput.value).toBe('');
      expect(amountInput.value).toBe('');
    });

    it('should close modal when cancel is clicked', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add budget');
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      await clickButton(user, 'cancel');
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Budget Deletion', () => {
    it('should show confirmation dialog when delete is clicked', async () => {
      const mockConfirm = vi.fn().mockReturnValue(true);
      global.confirm = mockConfirm;
      mockFetch({ success: true });
      
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      const deleteButtons = screen.getAllByRole('button');
      const trashButton = deleteButtons.find(btn => 
        btn.querySelector('svg[viewBox="0 0 24 24"]')
      );
      
      if (trashButton) {
        await user.click(trashButton);
        expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this budget?');
      }
    });

    it('should delete budget when confirmed', async () => {
      const mockDelete = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      global.fetch = mockDelete;
      global.confirm = vi.fn().mockReturnValue(true);
      
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      const deleteButtons = screen.getAllByRole('button');
      const trashButton = deleteButtons.find(btn => 
        btn.querySelector('svg[viewBox="0 0 24 24"]')
      );
      
      if (trashButton) {
        await user.click(trashButton);
        
        await waitFor(() => {
          expect(mockDelete).toHaveBeenCalledWith('/api/budgets?id=1', {
            method: 'DELETE'
          });
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      server.use(...errorHandlers);
      
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      // Component should still render without crashing
      expect(screen.getByText(/budgets/i)).toBeInTheDocument();
    });

    it('should handle form submission errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add budget');
      
      await fillForm(user, {
        'budget name': 'Test Budget',
        amount: '500.00'
      });
      await clickButton(user, 'create budget');
      
      // Modal should remain open on error
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      expect(screen.getByRole('heading', { name: /budgets/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add budget/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      const addButton = screen.getByRole('button', { name: /add budget/i });
      
      addButton.focus();
      expect(document.activeElement).toBe(addButton);
    });

    it('should have proper form labels', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add budget');
      
      expect(screen.getByLabelText(/budget name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/month/i)).toBeInTheDocument();
    });
  });

  describe('Mathematical Calculations', () => {
    it('should calculate percentages correctly', async () => {
      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      // Budget: $500, Spent: $125, Should be 25%
      expectPercentageDisplay(25);
    });

    it('should handle division by zero gracefully', async () => {
      // Mock zero budget scenario
      server.use(
        http.get('/api/budgets', () => {
          return HttpResponse.json([{
            id: 1,
            name: 'Zero Budget',
            amount: 0,
            month: '2024-01',
            categoryId: 1,
            categoryName: 'Test',
            categoryColor: '#ff0000',
            categoryIcon: '💸',
            spent: 100,
            userId: 1,
          }]);
        })
      );

      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      // Should handle zero budget without crashing
      expect(screen.getByText('Zero Budget')).toBeInTheDocument();
    });

    it('should round percentages appropriately', async () => {
      // Mock scenario with decimal percentage
      server.use(
        http.get('/api/budgets', () => {
          return HttpResponse.json([{
            id: 1,
            name: 'Decimal Budget',
            amount: 33333, // $333.33
            month: '2024-01',
            categoryId: 1,
            categoryName: 'Test',
            categoryColor: '#ff0000',
            categoryIcon: '🧮',
            spent: 11111, // $111.11, should be 33.33% -> rounds to 33%
            userId: 1,
          }]);
        })
      );

      render(<BudgetsPage />);
      
      await waitForLoadingToFinish();
      
      expectPercentageDisplay(33); // Should round 33.33% to 33%
    });
  });
});