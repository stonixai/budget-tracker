import { db } from '@/app/db';
import { transactions, categories, budgets } from '@/app/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import type { Transaction, Category, Budget } from '@/app/db/schema';

export interface SpendingPattern {
  category: string;
  averageMonthly: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  insights: string[];
}

export interface BudgetInsight {
  category: string;
  budgetAmount: number;
  spentAmount: number;
  utilizationPercentage: number;
  status: 'on_track' | 'warning' | 'exceeded';
  recommendation: string;
}

export interface FinancialSummary {
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  topSpendingCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  unusualTransactions: Array<{
    description: string;
    amount: number;
    date: string;
    reason: string;
  }>;
}

export interface AIInsights {
  spendingPatterns: SpendingPattern[];
  budgetInsights: BudgetInsight[];
  financialSummary: FinancialSummary;
  recommendations: string[];
  alerts: Array<{
    type: 'warning' | 'info' | 'success';
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export class AIInsightsService {
  async generateInsights(userId: string): Promise<AIInsights> {
    try {
      // Get data for the last 6 months
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 6));
      const currentMonth = new Date();

      // Fetch transactions with categories
      const userTransactions = await db
        .select({
          transaction: transactions,
          category: categories,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.userId, userId),
            gte(transactions.date, format(sixMonthsAgo, 'yyyy-MM-dd'))
          )
        )
        .orderBy(desc(transactions.date));

      // Get current month's budgets
      const currentMonthBudgets = await db
        .select()
        .from(budgets)
        .where(
          and(
            eq(budgets.userId, userId),
            eq(budgets.month, format(currentMonth, 'yyyy-MM'))
          )
        );

      const spendingPatterns = await this.analyzeSpendingPatterns(userTransactions);
      const budgetInsights = await this.analyzeBudgetPerformance(userTransactions, currentMonthBudgets);
      const financialSummary = await this.generateFinancialSummary(userTransactions);
      const recommendations = this.generateRecommendations(spendingPatterns, budgetInsights, financialSummary);
      const alerts = this.generateAlerts(budgetInsights, financialSummary);

      return {
        spendingPatterns,
        budgetInsights,
        financialSummary,
        recommendations,
        alerts,
      };
    } catch (error) {
      console.error('Error generating AI insights:', error);
      throw new Error('Failed to generate insights');
    }
  }

  private async analyzeSpendingPatterns(transactionsData: Array<{
    transaction: Transaction;
    category: Category | null;
  }>): Promise<SpendingPattern[]> {
    const categorySpending = new Map<string, number[]>();
    
    // Group transactions by category and month
    const monthlyData = new Map<string, Map<string, number>>();

    transactionsData.forEach(({ transaction, category }) => {
      if (!category || transaction.type !== 'expense') return;

      const month = transaction.date.substring(0, 7); // YYYY-MM format
      
      if (!monthlyData.has(category.name)) {
        monthlyData.set(category.name, new Map());
      }
      
      const categoryMonthly = monthlyData.get(category.name)!;
      const currentAmount = categoryMonthly.get(month) || 0;
      categoryMonthly.set(month, currentAmount + transaction.amount);
    });

    const patterns: SpendingPattern[] = [];

    monthlyData.forEach((months, categoryName) => {
      const amounts = Array.from(months.values());
      if (amounts.length < 2) return; // Need at least 2 months of data

      const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
      
      // Calculate trend (simple linear regression slope)
      const n = amounts.length;
      const indices = Array.from({length: n}, (_, i) => i);
      const sumX = indices.reduce((sum, x) => sum + x, 0);
      const sumY = amounts.reduce((sum, y) => sum + y, 0);
      const sumXY = indices.reduce((sum, x, i) => sum + x * amounts[i], 0);
      const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const trendPercentage = Math.abs((slope / average) * 100);
      
      let trend: 'increasing' | 'decreasing' | 'stable';
      if (trendPercentage < 5) {
        trend = 'stable';
      } else if (slope > 0) {
        trend = 'increasing';
      } else {
        trend = 'decreasing';
      }

      const insights: string[] = [];
      
      if (trend === 'increasing' && trendPercentage > 10) {
        insights.push(`Your ${categoryName.toLowerCase()} spending has increased by ${trendPercentage.toFixed(1)}% over recent months.`);
      } else if (trend === 'decreasing' && trendPercentage > 10) {
        insights.push(`Great job! Your ${categoryName.toLowerCase()} spending has decreased by ${trendPercentage.toFixed(1)}%.`);
      }

      if (average > 50000) { // $500+
        insights.push(`This is one of your major expense categories at $${(average / 100).toFixed(0)}/month.`);
      }

      patterns.push({
        category: categoryName,
        averageMonthly: average,
        trend,
        trendPercentage,
        insights,
      });
    });

    return patterns.sort((a, b) => b.averageMonthly - a.averageMonthly);
  }

  private async analyzeBudgetPerformance(
    transactionsData: Array<{ transaction: Transaction; category: Category | null }>,
    budgets: Budget[]
  ): Promise<BudgetInsight[]> {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const currentMonthTransactions = transactionsData.filter(
      ({ transaction }) => transaction.date.startsWith(currentMonth) && transaction.type === 'expense'
    );

    const insights: BudgetInsight[] = [];

    for (const budget of budgets) {
      // Find category
      const categoryTransactions = currentMonthTransactions.filter(
        ({ transaction }) => transaction.categoryId === budget.categoryId
      );

      const spentAmount = categoryTransactions.reduce(
        (sum, { transaction }) => sum + transaction.amount,
        0
      );

      const utilizationPercentage = (spentAmount / budget.amount) * 100;

      let status: 'on_track' | 'warning' | 'exceeded';
      let recommendation: string;

      if (utilizationPercentage <= 75) {
        status = 'on_track';
        recommendation = `You're doing well! You've used ${utilizationPercentage.toFixed(1)}% of your ${budget.name} budget.`;
      } else if (utilizationPercentage <= 100) {
        status = 'warning';
        recommendation = `Caution: You've used ${utilizationPercentage.toFixed(1)}% of your ${budget.name} budget. Consider reducing spending in this category.`;
      } else {
        status = 'exceeded';
        recommendation = `Budget exceeded! You've spent ${utilizationPercentage.toFixed(1)}% of your ${budget.name} budget. Review your spending in this category.`;
      }

      insights.push({
        category: budget.name,
        budgetAmount: budget.amount,
        spentAmount,
        utilizationPercentage,
        status,
        recommendation,
      });
    }

    return insights;
  }

  private async generateFinancialSummary(transactionsData: Array<{
    transaction: Transaction;
    category: Category | null;
  }>): Promise<FinancialSummary> {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const currentMonthTransactions = transactionsData.filter(
      ({ transaction }) => transaction.date.startsWith(currentMonth)
    );

    const monthlyIncome = currentMonthTransactions
      .filter(({ transaction }) => transaction.type === 'income')
      .reduce((sum, { transaction }) => sum + transaction.amount, 0);

    const monthlyExpenses = currentMonthTransactions
      .filter(({ transaction }) => transaction.type === 'expense')
      .reduce((sum, { transaction }) => sum + transaction.amount, 0);

    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

    // Top spending categories
    const categorySpending = new Map<string, number>();
    currentMonthTransactions
      .filter(({ transaction }) => transaction.type === 'expense')
      .forEach(({ transaction, category }) => {
        if (category) {
          const current = categorySpending.get(category.name) || 0;
          categorySpending.set(category.name, current + transaction.amount);
        }
      });

    const topSpendingCategories = Array.from(categorySpending.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / monthlyExpenses) * 100,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Unusual transactions (amounts significantly above average for the category)
    const unusualTransactions: FinancialSummary['unusualTransactions'] = [];
    
    // Calculate average transaction amounts by category
    const categoryAverages = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    transactionsData.forEach(({ transaction, category }) => {
      if (category && transaction.type === 'expense') {
        const current = categoryAverages.get(category.name) || 0;
        const count = categoryCounts.get(category.name) || 0;
        categoryAverages.set(category.name, current + transaction.amount);
        categoryCounts.set(category.name, count + 1);
      }
    });

    categoryAverages.forEach((sum, category) => {
      const count = categoryCounts.get(category) || 1;
      categoryAverages.set(category, sum / count);
    });

    // Find unusual transactions (3x above average)
    currentMonthTransactions
      .filter(({ transaction }) => transaction.type === 'expense')
      .forEach(({ transaction, category }) => {
        if (category) {
          const average = categoryAverages.get(category.name) || 0;
          if (transaction.amount > average * 3 && transaction.amount > 10000) { // $100+
            unusualTransactions.push({
              description: transaction.description,
              amount: transaction.amount,
              date: transaction.date,
              reason: `This transaction is ${Math.round(transaction.amount / average)}x higher than your average ${category.name.toLowerCase()} spending.`,
            });
          }
        }
      });

    return {
      monthlyIncome,
      monthlyExpenses,
      savingsRate,
      topSpendingCategories,
      unusualTransactions: unusualTransactions.slice(0, 5),
    };
  }

  private generateRecommendations(
    patterns: SpendingPattern[],
    budgetInsights: BudgetInsight[],
    summary: FinancialSummary
  ): string[] {
    const recommendations: string[] = [];

    // Savings rate recommendations
    if (summary.savingsRate < 10) {
      recommendations.push("💰 Consider increasing your savings rate to at least 10% by reducing discretionary spending.");
    } else if (summary.savingsRate > 30) {
      recommendations.push("🎉 Excellent savings rate! You're building wealth effectively.");
    }

    // Budget recommendations
    const exceededBudgets = budgetInsights.filter(insight => insight.status === 'exceeded');
    if (exceededBudgets.length > 0) {
      recommendations.push(`📊 You've exceeded ${exceededBudgets.length} budget(s). Consider adjusting your spending or increasing these budgets.`);
    }

    // Spending pattern recommendations
    const increasingCategories = patterns.filter(p => p.trend === 'increasing' && p.trendPercentage > 15);
    if (increasingCategories.length > 0) {
      recommendations.push(`📈 Monitor your spending in ${increasingCategories[0].category.toLowerCase()} - it's increased by ${increasingCategories[0].trendPercentage.toFixed(1)}% recently.`);
    }

    // Top category optimization
    if (summary.topSpendingCategories.length > 0) {
      const topCategory = summary.topSpendingCategories[0];
      if (topCategory.percentage > 30) {
        recommendations.push(`🎯 ${topCategory.category} represents ${topCategory.percentage.toFixed(1)}% of your spending. Look for optimization opportunities.`);
      }
    }

    // Emergency fund recommendation
    if (summary.monthlyExpenses > 0) {
      const emergencyFundGoal = summary.monthlyExpenses * 6;
      recommendations.push(`🚨 Aim to have $${(emergencyFundGoal / 100).toFixed(0)} in emergency savings (6 months of expenses).`);
    }

    return recommendations;
  }

  private generateAlerts(budgetInsights: BudgetInsight[], summary: FinancialSummary): AIInsights['alerts'] {
    const alerts: AIInsights['alerts'] = [];

    // Budget alerts
    budgetInsights.forEach(insight => {
      if (insight.status === 'exceeded') {
        alerts.push({
          type: 'warning',
          message: `Budget exceeded for ${insight.category}: ${insight.utilizationPercentage.toFixed(1)}% used`,
          priority: 'high',
        });
      } else if (insight.status === 'warning') {
        alerts.push({
          type: 'warning',
          message: `Approaching budget limit for ${insight.category}: ${insight.utilizationPercentage.toFixed(1)}% used`,
          priority: 'medium',
        });
      }
    });

    // Savings rate alerts
    if (summary.savingsRate < 0) {
      alerts.push({
        type: 'warning',
        message: 'You spent more than you earned this month',
        priority: 'high',
      });
    } else if (summary.savingsRate < 5) {
      alerts.push({
        type: 'warning',
        message: `Low savings rate: ${summary.savingsRate.toFixed(1)}%. Consider reducing expenses.`,
        priority: 'medium',
      });
    }

    // Unusual spending alert
    if (summary.unusualTransactions.length > 0) {
      alerts.push({
        type: 'info',
        message: `${summary.unusualTransactions.length} unusual transaction(s) detected this month`,
        priority: 'low',
      });
    }

    // Positive reinforcement
    if (summary.savingsRate > 20) {
      alerts.push({
        type: 'success',
        message: `Great job! ${summary.savingsRate.toFixed(1)}% savings rate this month`,
        priority: 'low',
      });
    }

    return alerts;
  }
}

export const aiInsights = new AIInsightsService();