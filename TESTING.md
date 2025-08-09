# Testing Framework Documentation

This document provides comprehensive guidance for testing the Budget Tracker application.

## Overview

Our testing strategy implements a multi-layered approach ensuring maximum coverage and reliability:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test API routes and database interactions
- **End-to-End Tests**: Test complete user workflows
- **Coverage Analysis**: Ensure critical code paths are thoroughly tested
- **Security Testing**: Validate input sanitization and data protection

## Test Structure

```
tests/
├── unit/                    # Unit tests for utilities and components
│   ├── currency.test.ts     # Currency formatting functions (100% coverage required)
│   ├── calculations.test.ts # Financial calculations (100% coverage required)
│   ├── database.test.ts     # Database operations
│   └── components/          # React component tests
├── integration/             # API route integration tests
│   ├── api-transactions.test.ts
│   ├── api-budgets.test.ts
│   └── api-categories.test.ts
├── e2e/                     # End-to-end Playwright tests
│   ├── budget-tracking-flow.spec.ts
│   └── dashboard.spec.ts
├── utils/                   # Test utilities and helpers
│   ├── test-db.ts          # Test database configuration
│   ├── factories.ts        # Data factories for test scenarios
│   ├── test-helpers.ts     # Reusable test helper functions
│   └── __mocks__/          # Mock handlers for MSW
├── fixtures/               # Test data fixtures
└── config/                 # Test configuration files
    └── coverage-thresholds.json
```

## Running Tests

### Development Workflow

```bash
# Run tests in watch mode during development
npm run test:watch

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run all tests
npm run test:all

# Generate coverage report
npm run test:coverage

# Validate coverage thresholds
npm run test:coverage:validate
```

### CI/CD Integration

```bash
# Complete test suite for CI/CD
npm run test:ci

# Generate test report
npm run test:report
```

## Coverage Requirements

### Global Thresholds
- **Lines**: 80% minimum
- **Branches**: 80% minimum  
- **Functions**: 80% minimum
- **Statements**: 80% minimum

### Critical Function Requirements (100% Coverage)
- `app/utils/currency.ts` - All currency formatting and parsing functions
- `app/utils/calculations.ts` - All financial calculation functions

These functions handle monetary calculations and must have complete test coverage to prevent financial errors.

### Component-Specific Thresholds
- **API Routes**: 90% coverage (high reliability required)
- **React Components**: 75% coverage
- **Database Operations**: 85% coverage

## Writing Tests

### Unit Tests

Use the utilities and factories provided:

```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrencyInput } from '@/app/utils/currency';

describe('Currency Functions', () => {
  it('should format currency correctly', () => {
    expect(formatCurrency(12345)).toBe('$123.45');
  });

  it('should parse currency input', () => {
    expect(parseCurrencyInput('$123.45')).toBe(12345);
  });
});
```

### Integration Tests

Test API routes with the test database:

```typescript
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/transactions/route';
import { createUser, createCategory } from '../utils/factories';

describe('Transactions API', () => {
  it('should create transaction', async () => {
    const user = await createUser();
    const category = await createCategory(user.id);
    
    const request = new NextRequest('http://localhost/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        amount: 5000,
        description: 'Test transaction',
        categoryId: category.id
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
```

### Component Tests

Test React components with React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionsPage from '@/app/transactions/page';

describe('TransactionsPage', () => {
  it('should display transactions', async () => {
    render(<TransactionsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Transactions')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests

Test complete user workflows:

```typescript
import { test, expect } from '@playwright/test';

test('complete budget tracking workflow', async ({ page }) => {
  await page.goto('/');
  
  // Navigate and create transaction
  await page.getByRole('link', { name: /transactions/i }).click();
  await page.getByRole('button', { name: /add transaction/i }).click();
  
  // Fill form and submit
  await page.getByLabel(/description/i).fill('Test Transaction');
  await page.getByLabel(/amount/i).fill('50.00');
  await page.getByRole('button', { name: /add transaction/i }).click();
  
  // Verify transaction appears
  await expect(page.getByText('Test Transaction')).toBeVisible();
});
```

## Test Database

Tests use an in-memory SQLite database that is:
- Isolated between tests
- Reset before each test
- Fast and reliable
- Identical schema to production

The test database is configured in `tests/utils/test-db.ts`.

## Mock Service Worker (MSW)

API mocking is handled by MSW with handlers in `tests/__mocks__/handlers.ts`:

```typescript
export const handlers = [
  http.get('/api/transactions', () => {
    return HttpResponse.json([
      { id: 1, amount: 5000, description: 'Test transaction' }
    ]);
  })
];
```

## Data Factories

Use factories for consistent test data:

```typescript
import { createUser, createCategory, createTransaction } from './utils/factories';

// Create test scenario
const user = await createUser({ email: 'test@example.com' });
const category = await createCategory(user.id, { name: 'Test Category' });
const transaction = await createTransaction(user.id, category.id, {
  amount: 5000,
  description: 'Test transaction'
});
```

## Security Testing

Security tests validate:
- XSS prevention in user inputs
- SQL injection protection
- Data isolation between users
- Input validation and sanitization

Example security test:
```typescript
it('should prevent XSS in transaction description', async () => {
  const maliciousInput = '<script>alert("XSS")</script>';
  
  const response = await createTransaction({
    description: maliciousInput,
    amount: 1000
  });
  
  // Should store as text, not execute
  expect(response.description).toBe(maliciousInput);
});
```

## Performance Testing

Performance tests ensure:
- API response times under acceptable limits
- Component rendering performance
- Database query efficiency
- Large dataset handling

## Debugging Tests

### Visual Debugging
```bash
# Open Vitest UI for visual test debugging
npm run test:ui

# Open Playwright UI for E2E debugging
npm run test:e2e:ui

# Debug specific E2E test
npm run test:e2e:debug
```

### Debug Configuration
- VS Code debugging configuration available
- Browser dev tools integration for E2E tests
- Detailed error reporting and stack traces

## Continuous Integration

Tests run automatically on:
- Pull requests to main/develop branches
- Pushes to protected branches
- Scheduled nightly runs

CI pipeline includes:
- Unit and integration tests
- E2E tests across multiple browsers
- Coverage validation
- Security audit
- Performance benchmarks
- Quality gates validation

## Quality Gates

All quality gates must pass before deployment:

| Gate | Requirement | Purpose |
|------|-------------|---------|
| Unit Test Coverage | ≥ 80% | Code quality assurance |
| Critical Function Coverage | 100% | Financial accuracy |
| API Route Coverage | ≥ 90% | Backend reliability |
| Build Success | Must pass | Deployment readiness |
| Linting | No errors | Code standards |
| Type Checking | No errors | Type safety |
| Security Audit | No high/critical | Security compliance |

## Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests focused and isolated

### Data Management
- Use factories for test data creation
- Clean database between tests
- Avoid hardcoded test data
- Use realistic test scenarios

### Assertions
- Prefer specific assertions over generic ones
- Test both positive and negative cases
- Include edge cases and error scenarios
- Validate error messages and codes

### Performance
- Keep tests fast and focused
- Use parallel execution where possible
- Mock external dependencies
- Optimize test database operations

## Troubleshooting

### Common Issues

**Tests failing due to timing**
```typescript
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Expected text')).toBeInTheDocument();
});
```

**Database connection issues**
```bash
# Reset test database
npm run db:generate && npm run db:migrate
```

**Coverage not meeting thresholds**
```bash
# Check detailed coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

**E2E tests failing in CI**
```bash
# Check Playwright configuration
# Ensure proper browser setup in CI
npm run test:e2e:debug
```

## Contributing

When adding new features:

1. **Write tests first** (TDD approach recommended)
2. **Ensure 100% coverage** for financial functions
3. **Add integration tests** for new API routes
4. **Include E2E tests** for new user workflows
5. **Update documentation** for new test patterns
6. **Validate security** implications of changes

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [MSW Documentation](https://mswjs.io/)
- [React Testing Patterns](https://react-testing-examples.com/)

For questions or issues with the testing framework, please refer to the development team or create an issue in the project repository.