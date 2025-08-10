'use client';

import { TourProvider, useTour } from '@reactour/tour';
import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';

interface OnboardingTourProps {
  children: React.ReactNode;
}

const steps = [
  {
    selector: '[data-tour="dashboard"]',
    content: 'Welcome to your budget tracker dashboard! This is where you can see all your financial data at a glance.',
    position: 'bottom' as const,
  },
  {
    selector: '[data-tour="add-transaction"]',
    content: 'Click here to add new income or expenses. You can also import data from CSV files.',
    position: 'bottom' as const,
  },
  {
    selector: '[data-tour="categories"]',
    content: 'Organize your transactions with categories. Create custom categories for better tracking.',
    position: 'bottom' as const,
  },
  {
    selector: '[data-tour="budgets"]',
    content: 'Set monthly budgets for different categories to stay on track with your spending goals.',
    position: 'bottom' as const,
  },
  {
    selector: '[data-tour="recurring"]',
    content: 'Set up recurring transactions like salary, rent, or subscriptions to automate your budget.',
    position: 'bottom' as const,
  },
  {
    selector: '[data-tour="goals"]',
    content: 'Create financial goals and track your progress towards achieving them.',
    position: 'bottom' as const,
  },
  {
    selector: '[data-tour="accounts"]',
    content: 'Manage multiple accounts like checking, savings, credit cards in one place.',
    position: 'bottom' as const,
  },
  {
    selector: '[data-tour="analytics"]',
    content: 'View detailed analytics and insights about your spending patterns and trends.',
    position: 'bottom' as const,
  },
];

function TourController() {
  const { setIsOpen } = useTour();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('budget-tracker-onboarding-completed');
    if (!hasCompletedOnboarding) {
      setShowWelcome(true);
    }
  }, []);

  const startTour = () => {
    setShowWelcome(false);
    setIsOpen(true);
  };

  const skipTour = () => {
    setShowWelcome(false);
    localStorage.setItem('budget-tracker-onboarding-completed', 'true');
  };

  const onTourComplete = () => {
    localStorage.setItem('budget-tracker-onboarding-completed', 'true');
  };

  if (!showWelcome) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Welcome to Budget Tracker! 🎉
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Let's take a quick tour to help you get started with managing your finances effectively.
        </p>
        <div className="flex space-x-3">
          <Button onClick={startTour} className="flex-1">
            Take Tour
          </Button>
          <Button onClick={skipTour} variant="ghost" className="flex-1">
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OnboardingTour({ children }: OnboardingTourProps) {
  return (
    <TourProvider
      steps={steps}
      beforeClose={() => {
        localStorage.setItem('budget-tracker-onboarding-completed', 'true');
      }}
      styles={{
        popover: (base) => ({
          ...base,
          '--reactour-accent': '#6366f1',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        }),
        maskArea: (base) => ({
          ...base,
          rx: 4,
        }),
        badge: (base) => ({
          ...base,
          left: 'auto',
          right: '-0.8125em',
        }),
      }}
      padding={{ mask: 5, popover: 5 }}
      scrollSmooth
    >
      <TourController />
      {children}
    </TourProvider>
  );
}

// Hook for manually triggering the tour
export function useTourTrigger() {
  const { setIsOpen } = useTour();

  const startTour = () => {
    setIsOpen(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('budget-tracker-onboarding-completed');
    window.location.reload();
  };

  return { startTour, resetOnboarding };
}