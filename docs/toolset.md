# Toolset Documentation

This document outlines the complete technology stack and tools used in this Next.js budget tracking application.

## Core Framework & Runtime

- **Next.js 15.4.6** - Full-stack React framework with App Router
- **React 19.1.0** - UI library with latest concurrent features
- **TypeScript 5** - Type-safe JavaScript development
- **Node.js** - JavaScript runtime environment

## Styling & UI

- **Tailwind CSS v4** - Utility-first CSS framework
- **Custom UI Components** - Built-in component library (`components/ui/`)
- **Theme System** - Dark/light mode support with context API

## Database & ORM

- **SQLite** - Lightweight file-based database
- **better-sqlite3** - High-performance SQLite driver
- **Drizzle ORM** - Type-safe SQL ORM with excellent TypeScript support
- **Drizzle Kit** - Database migration and introspection toolkit

## Authentication & Security

- **NextAuth.js v5** - Authentication framework with session management
- **Drizzle Adapter** - Database adapter for NextAuth
- **bcryptjs** - Password hashing and validation
- **Zod** - Runtime type validation and schema validation

## Data Visualization & Charts

- **Recharts** - React charting library built on D3
- **Custom Analytics Components** - Purpose-built charts for financial data

## File Processing & Export

- **jsPDF** - Client-side PDF generation
- **jsPDF AutoTable** - Table plugin for structured PDF reports
- **PapaParse** - CSV parsing and generation

## Caching & Performance

- **ioredis** - Redis client for future caching implementation (installed but not yet configured)
- **Next.js Built-in Caching** - Page and data caching strategies
- **Performance Monitoring** - Custom performance tracking components

## Testing Framework

### Unit & Integration Testing
- **Vitest** - Fast unit test runner with ES modules support
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Custom Jest matchers for DOM testing
- **@testing-library/user-event** - User interaction simulation
- **Happy DOM / JSDOM** - DOM environment for testing
- **MSW (Mock Service Worker)** - API mocking for tests

### End-to-End Testing
- **Playwright** - Cross-browser E2E testing framework
- **Custom Test Utilities** - Domain-specific testing helpers
- **Test Factories** - Data generation for consistent testing

### Code Coverage
- **@vitest/coverage-v8** - V8-based code coverage reporting
- **C8** - Additional coverage tooling
- **Custom Coverage Validation** - Automated coverage threshold checking

## Development Tools

### Code Quality
- **ESLint** - JavaScript/TypeScript linting with Next.js config
- **Prettier** - Code formatting and style consistency
- **TypeScript Compiler** - Type checking and compilation
- **audit-ci** - Security vulnerability scanning

### Build & Bundling
- **Turbopack** - Next.js's fast bundler for development
- **PostCSS** - CSS processing and optimization
- **Bundle Analyzer** - Build size analysis and optimization

## Utilities & Helpers

### Date & Time
- **date-fns** - Comprehensive date utility library

### Email
- **Nodemailer** - Email sending capabilities (installed but not yet implemented)

### User Experience
- **@reactour/tour** - Interactive application tours and onboarding (installed but not yet implemented)
- **@reactour/mask** - Tour step masking and highlighting (installed but not yet implemented)
- **@reactour/popover** - Tour popover components (installed but not yet implemented)

### Data Generation
- **@faker-js/faker** - Realistic fake data generation for development and testing

## Database Schema

The application uses a comprehensive schema including:
- **Users** - User accounts and authentication
- **Transactions** - Financial transaction records
- **Categories** - Transaction categorization
- **Budgets** - Budget planning and tracking
- **Posts** - Content management (legacy from initial setup)
- **Accounts** - NextAuth.js authentication accounts
- **Sessions** - User session management
- **Verification Tokens** - Email verification system

## Development Workflow

### Available Scripts
- `npm run dev` - Development server on port 3001
- `npm run build` - Production build
- `npm run lint` - Code linting
- `npm run type-check` - TypeScript type checking
- `npm run format` - Code formatting
- `npm run test:*` - Various testing commands
- `npm run db:*` - Database management commands

### Testing Strategy
- **Unit Tests** - Component and utility function testing
- **Integration Tests** - API endpoint and database testing
- **E2E Tests** - Full user journey testing
- **Performance Tests** - Load and performance validation
- **Security Tests** - Security vulnerability testing

## Future Enhancements (Not Yet Implemented)

The following features are planned but not yet implemented:
- **Redis Caching** - Session storage and performance optimization
- **Email Notifications** - Transaction alerts and budget reminders
- **Interactive Tours** - User onboarding and feature discovery
- **Advanced Analytics** - Machine learning for spending patterns
- **Mobile App** - React Native companion application

This toolset provides a robust foundation for building, testing, and maintaining a production-ready financial application with comprehensive features and excellent developer experience.