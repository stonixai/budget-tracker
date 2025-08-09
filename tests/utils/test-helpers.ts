import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement } from 'react';

// Custom render function for components that need providers
export function renderWithProviders(ui: ReactElement) {
  return render(ui);
}

// Helper to wait for async operations
export async function waitForLoadingToFinish() {
  await waitFor(
    () => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    },
    { timeout: 5000 }
  );
}

// Helper for user interactions
export function createUserInteractions() {
  return userEvent.setup();
}

// Helper to mock fetch responses
export function mockFetch(response: any, ok = true) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(response),
    } as Response)
  );
}

// Helper to mock fetch error
export function mockFetchError(error = new Error('Network error')) {
  global.fetch = vi.fn(() => Promise.reject(error));
}

// Helper to verify API call
export function expectApiCall(url: string, options?: RequestInit) {
  expect(fetch).toHaveBeenCalledWith(url, options);
}

// Helper for form testing
export async function fillForm(user: ReturnType<typeof userEvent.setup>, fields: Record<string, string>) {
  for (const [fieldName, value] of Object.entries(fields)) {
    const field = screen.getByRole('textbox', { name: new RegExp(fieldName, 'i') }) ||
                  screen.getByRole('spinbutton', { name: new RegExp(fieldName, 'i') }) ||
                  screen.getByLabelText(new RegExp(fieldName, 'i'));
    
    await user.clear(field);
    await user.type(field, value);
  }
}

// Helper for selecting options
export async function selectOption(user: ReturnType<typeof userEvent.setup>, selectName: string, optionValue: string) {
  const select = screen.getByLabelText(new RegExp(selectName, 'i'));
  await user.selectOptions(select, optionValue);
}

// Helper for clicking buttons
export async function clickButton(user: ReturnType<typeof userEvent.setup>, buttonName: string) {
  const button = screen.getByRole('button', { name: new RegExp(buttonName, 'i') });
  await user.click(button);
}

// Helper to verify currency display
export function expectCurrencyDisplay(value: number, expectedText: string) {
  expect(screen.getByText(expectedText)).toBeInTheDocument();
}

// Helper to verify percentage display
export function expectPercentageDisplay(percentage: number) {
  expect(screen.getByText(`${percentage}%`)).toBeInTheDocument();
}

// Helper for modal testing
export async function openModal(user: ReturnType<typeof userEvent.setup>, triggerText: string) {
  await clickButton(user, triggerText);
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
}

export async function closeModal(user: ReturnType<typeof userEvent.setup>) {
  const cancelButton = screen.getByRole('button', { name: /cancel/i });
  await user.click(cancelButton);
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
}

// Helper for date formatting in tests
export function formatTestDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

// Helper to create mock API handlers
export function createMockHandler(path: string, response: any, method = 'GET') {
  return {
    method,
    path,
    response,
  };
}

// Helper for error boundary testing
export function expectErrorBoundary(errorMessage?: string) {
  if (errorMessage) {
    expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
  } else {
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  }
}

// Helper for loading states
export function expectLoadingState() {
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
}

// Helper for empty states
export function expectEmptyState(message: string) {
  expect(screen.getByText(new RegExp(message, 'i'))).toBeInTheDocument();
}

// Security test helpers
export function createXSSPayload(): string {
  return '<script>alert("XSS")</script>';
}

export function createSQLInjectionPayload(): string {
  return "'; DROP TABLE users; --";
}

export function expectNoScriptExecution() {
  // Verify no script tags are executed
  const scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    expect(scripts[i].innerHTML).not.toContain('alert');
  }
}