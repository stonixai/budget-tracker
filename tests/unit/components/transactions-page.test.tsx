import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionsPage from '../../../app/transactions/page';
import { server } from '../../setup';
import { handlers, errorHandlers } from '../../__mocks__/handlers';
import { 
  renderWithProviders, 
  waitForLoadingToFinish, 
  createUserInteractions,
  mockFetch,
  mockFetchError,
  fillForm,
  selectOption,
  clickButton,
  expectCurrencyDisplay
} from '../../utils/test-helpers';

describe('TransactionsPage Component', () => {
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
      render(<TransactionsPage />);
      
      expect(screen.getByRole('heading', { name: /transactions/i })).toBeInTheDocument();
      expect(screen.getByText(/track your income and expenses/i)).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<TransactionsPage />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render navigation and action buttons', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /new category/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument();
    });
  });

  describe('Transaction List', () => {
    it('should display transactions when data is loaded', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      
      expect(screen.getByText('Weekly groceries')).toBeInTheDocument();
      expect(screen.getByText('Monthly salary')).toBeInTheDocument();
      expectCurrencyDisplay(12500, '$125.00');
      expectCurrencyDisplay(500000, '$5,000.00');
    });

    it('should show transaction details correctly', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      
      // Check for category information
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Salary')).toBeInTheDocument();
      
      // Check for transaction types (income shows +, expense shows -)
      expect(screen.getByText('-$125.00')).toBeInTheDocument();
      expect(screen.getByText('+$5,000.00')).toBeInTheDocument();
      
      // Check for dates
      expect(screen.getByText('1/15/2024')).toBeInTheDocument();
      expect(screen.getByText('1/1/2024')).toBeInTheDocument();
    });

    it('should show empty state when no transactions exist', async () => {
      // Mock empty response
      server.use(
        ...errorHandlers.map(handler => ({
          ...handler,
          resolver: () => Response.json([])
        }))
      );

      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first transaction to get started/i)).toBeInTheDocument();
    });

    it('should show delete buttons for each transaction', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      
      const deleteButtons = screen.getAllByRole('button');
      const trashButtons = deleteButtons.filter(btn => 
        btn.querySelector('svg[viewBox="0 0 24 24"]')
      );
      
      expect(trashButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Add Transaction Modal', () => {
    it('should open modal when add transaction button is clicked', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add transaction');
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add Transaction')).toBeInTheDocument();
    });

    it('should render all form fields in modal', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add transaction');
      
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    it('should have correct default values', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add transaction');
      
      const typeSelect = screen.getByLabelText(/type/i) as HTMLSelectElement;
      const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
      const today = new Date().toISOString().split('T')[0];
      
      expect(typeSelect.value).toBe('expense');
      expect(dateInput.value).toBe(today);
    });

    it('should filter categories based on selected type', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add transaction');
      
      // Should show expense categories by default
      const categorySelect = screen.getByLabelText(/category/i);
      expect(categorySelect).toContainHTML('🛒 Groceries');
      
      // Change to income
      await selectOption(user, 'type', 'income');
      
      // Should now show income categories
      await waitFor(() => {
        expect(categorySelect).toContainHTML('💼 Salary');
      });
    });

    it('should submit form with correct data', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, amount: 5000, description: 'Test expense' })
      });
      global.fetch = mockPost;

      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add transaction');
      
      await fillForm(user, {
        description: 'Test expense',
        amount: '50.00'
      });
      
      await selectOption(user, 'category', '1');
      await clickButton(user, 'add transaction');
      
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: 'Test expense',
            amount: 5000, // Should be converted to cents
            type: 'expense',
            categoryId: 1,
            date: expect.any(String)
          })
        });
      });
    });

    it('should close modal after successful submission', async () => {
      mockFetch({ id: 1, amount: 5000, description: 'Test' });
      
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add transaction');
      
      await fillForm(user, {
        description: 'Test expense',
        amount: '50.00'
      });
      await selectOption(user, 'category', '1');
      await clickButton(user, 'add transaction');
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should reset form after successful submission', async () => {
      mockFetch({ id: 1, amount: 5000, description: 'Test' });
      
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add transaction');
      
      await fillForm(user, {
        description: 'Test expense',
        amount: '50.00'
      });
      await selectOption(user, 'category', '1');
      await clickButton(user, 'add transaction');
      
      // Open modal again
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      
      await clickButton(user, 'add transaction');
      
      const descriptionInput = screen.getByLabelText(/description/i) as HTMLInputElement;
      const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
      
      expect(descriptionInput.value).toBe('');
      expect(amountInput.value).toBe('');
    });

    it('should handle form validation errors', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add transaction');
      
      // Try to submit without required fields
      await clickButton(user, 'add transaction');
      
      // Form should not submit (browser validation)
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should close modal when cancel is clicked', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add transaction');
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      await clickButton(user, 'cancel');
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Add Category Modal', () => {
    it('should open category modal when new category button is clicked', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'new category');
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add Category')).toBeInTheDocument();
    });

    it('should render category form fields', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'new category');
      
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/color/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/icon/i)).toBeInTheDocument();
    });

    it('should submit category form correctly', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'New Category', type: 'expense' })
      });
      global.fetch = mockPost;

      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'new category');
      
      await fillForm(user, {
        name: 'New Category'
      });
      
      const iconInput = screen.getByLabelText(/icon/i);
      await user.clear(iconInput);
      await user.type(iconInput, '🎯');
      
      await clickButton(user, 'add category');
      
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'New Category',
            type: 'expense',
            color: '#6366f1',
            icon: '🎯'
          })
        });
      });
    });
  });

  describe('Transaction Deletion', () => {
    it('should show confirmation dialog when delete is clicked', async () => {
      // Mock window.confirm
      const mockConfirm = vi.fn().mockReturnValue(true);
      global.confirm = mockConfirm;
      
      mockFetch({ success: true });
      
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      
      const deleteButtons = screen.getAllByRole('button');
      const trashButton = deleteButtons.find(btn => 
        btn.querySelector('svg[viewBox="0 0 24 24"]')
      );
      
      if (trashButton) {
        await user.click(trashButton);
        expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this transaction?');
      }
    });

    it('should delete transaction when confirmed', async () => {
      const mockDelete = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
      global.fetch = mockDelete;
      global.confirm = vi.fn().mockReturnValue(true);
      
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      
      const deleteButtons = screen.getAllByRole('button');
      const trashButton = deleteButtons.find(btn => 
        btn.querySelector('svg[viewBox="0 0 24 24"]')
      );
      
      if (trashButton) {
        await user.click(trashButton);
        
        await waitFor(() => {
          expect(mockDelete).toHaveBeenCalledWith('/api/transactions?id=1', {
            method: 'DELETE'
          });
        });
      }
    });

    it('should not delete when cancelled', async () => {
      const mockDelete = vi.fn();
      global.fetch = mockDelete;
      global.confirm = vi.fn().mockReturnValue(false);
      
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      
      const deleteButtons = screen.getAllByRole('button');
      const trashButton = deleteButtons.find(btn => 
        btn.querySelector('svg[viewBox="0 0 24 24"]')
      );
      
      if (trashButton) {
        await user.click(trashButton);
        expect(mockDelete).not.toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      server.use(...errorHandlers);
      
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      
      // Component should still render without crashing
      expect(screen.getByText(/transactions/i)).toBeInTheDocument();
    });

    it('should handle form submission errors', async () => {
      mockFetchError();
      
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add transaction');
      
      await fillForm(user, {
        description: 'Test expense',
        amount: '50.00'
      });
      await selectOption(user, 'category', '1');
      await clickButton(user, 'add transaction');
      
      // Modal should remain open on error
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      render(<TransactionsPage />);
      
      // Should show loading initially, then handle error
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      
      expect(screen.getByRole('heading', { name: /transactions/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /new category/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      
      const addButton = screen.getByRole('button', { name: /add transaction/i });
      
      // Should be focusable
      addButton.focus();
      expect(document.activeElement).toBe(addButton);
      
      // Should respond to Enter key
      fireEvent.keyDown(addButton, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should have proper form labels', async () => {
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      await clickButton(user, 'add transaction');
      
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render efficiently with large number of transactions', async () => {
      // Mock large dataset
      const manyTransactions = Array(100).fill(null).map((_, i) => ({
        id: i,
        amount: 1000 + i,
        description: `Transaction ${i}`,
        type: 'expense',
        date: '2024-01-15',
        categoryId: 1,
        categoryName: 'Test Category',
        categoryColor: '#ff0000',
        categoryIcon: '💰',
        createdAt: '2024-01-15T10:00:00Z'
      }));

      server.use(
        http.get('/api/transactions', () => {
          return HttpResponse.json(manyTransactions);
        })
      );

      const start = Date.now();
      render(<TransactionsPage />);
      
      await waitForLoadingToFinish();
      const end = Date.now();
      
      expect(end - start).toBeLessThan(5000); // Should render in under 5 seconds
      expect(screen.getByText('Transaction 0')).toBeInTheDocument();
    });
  });
});