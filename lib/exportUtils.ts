import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { formatCurrency } from './utils';

export interface Transaction {
  id: number;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  date: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
}

export interface Budget {
  id: number;
  name: string;
  amount: number;
  spent: number;
  month: string;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
}

export interface ExportOptions {
  includeCharts?: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
  includeCategories?: boolean;
  includeBudgets?: boolean;
  groupByCategory?: boolean;
  groupByMonth?: boolean;
}

class ExportService {
  // Export transactions to CSV
  async exportTransactionsToCSV(
    transactions: Transaction[], 
    filename: string = 'transactions.csv',
    options: ExportOptions = {}
  ): Promise<void> {
    let data = [...transactions];

    // Apply date range filter if specified
    if (options.dateRange?.from || options.dateRange?.to) {
      data = data.filter(t => {
        const transactionDate = new Date(t.date);
        const fromDate = options.dateRange?.from ? new Date(options.dateRange.from) : new Date(0);
        const toDate = options.dateRange?.to ? new Date(options.dateRange.to) : new Date();
        return transactionDate >= fromDate && transactionDate <= toDate;
      });
    }

    // Prepare CSV data
    const csvData = data.map(t => ({
      Date: t.date,
      Description: t.description,
      Category: t.categoryName,
      Type: t.type,
      Amount: t.amount / 100, // Convert from cents
      'Amount (Formatted)': formatCurrency(t.amount)
    }));

    // Add summary rows if grouping is enabled
    if (options.groupByCategory) {
      const categoryTotals = this.calculateCategoryTotals(data);
      csvData.push({} as any); // Empty row
      csvData.push({ Date: 'CATEGORY SUMMARY', Description: '', Category: '', Type: '', Amount: '', 'Amount (Formatted)': '' } as any);
      
      categoryTotals.forEach(({ categoryName, total, count }) => {
        csvData.push({
          Date: '',
          Description: `${count} transactions`,
          Category: categoryName,
          Type: '',
          Amount: total / 100,
          'Amount (Formatted)': formatCurrency(total)
        } as any);
      });
    }

    // Generate and download CSV
    const csv = Papa.unparse(csvData);
    this.downloadFile(csv, filename, 'text/csv');
  }

  // Export budgets to CSV
  async exportBudgetsToCSV(budgets: Budget[], filename: string = 'budgets.csv'): Promise<void> {
    const csvData = budgets.map(b => ({
      Name: b.name,
      Month: b.month,
      Category: b.categoryName || 'All Categories',
      'Budget Amount': b.amount / 100,
      'Amount Spent': b.spent / 100,
      'Amount Remaining': (b.amount - b.spent) / 100,
      'Budget Amount (Formatted)': formatCurrency(b.amount),
      'Amount Spent (Formatted)': formatCurrency(b.spent),
      'Amount Remaining (Formatted)': formatCurrency(b.amount - b.spent),
      'Percentage Used': Math.round((b.spent / b.amount) * 100) + '%'
    }));

    const csv = Papa.unparse(csvData);
    this.downloadFile(csv, filename, 'text/csv');
  }

  // Export comprehensive financial report to PDF
  async exportToPDF(
    transactions: Transaction[],
    budgets: Budget[],
    filename: string = 'financial_report.pdf',
    options: ExportOptions = {}
  ): Promise<void> {
    const doc = new jsPDF();
    let currentY = 20;

    // Apply date range filter
    let filteredTransactions = [...transactions];
    if (options.dateRange?.from || options.dateRange?.to) {
      filteredTransactions = filteredTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        const fromDate = options.dateRange?.from ? new Date(options.dateRange.from) : new Date(0);
        const toDate = options.dateRange?.to ? new Date(options.dateRange.to) : new Date();
        return transactionDate >= fromDate && transactionDate <= toDate;
      });
    }

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Report', 20, currentY);
    currentY += 10;

    // Date range
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    if (options.dateRange?.from || options.dateRange?.to) {
      const fromDate = options.dateRange?.from || 'Beginning';
      const toDate = options.dateRange?.to || 'Present';
      doc.text(`Period: ${fromDate} to ${toDate}`, 20, currentY);
    } else {
      doc.text('Period: All Time', 20, currentY);
    }
    currentY += 15;

    // Financial Summary
    const summary = this.calculateFinancialSummary(filteredTransactions);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', 20, currentY);
    currentY += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Income: ${formatCurrency(summary.totalIncome)}`, 20, currentY);
    currentY += 7;
    doc.text(`Total Expenses: ${formatCurrency(summary.totalExpenses)}`, 20, currentY);
    currentY += 7;
    doc.text(`Net Amount: ${formatCurrency(summary.netAmount)}`, 20, currentY);
    currentY += 7;
    doc.text(`Total Transactions: ${summary.totalTransactions}`, 20, currentY);
    currentY += 15;

    // Category Breakdown
    if (options.includeCategories) {
      const categoryTotals = this.calculateCategoryTotals(filteredTransactions.filter(t => t.type === 'expense'));
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Expense Categories', 20, currentY);
      currentY += 10;

      const categoryTableData = categoryTotals.map(({ categoryName, total, count }) => [
        categoryName,
        count.toString(),
        formatCurrency(total)
      ]);

      autoTable(doc, {
        head: [['Category', 'Transactions', 'Amount']],
        body: categoryTableData,
        startY: currentY,
        theme: 'striped',
        styles: { fontSize: 10 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Budget Summary
    if (options.includeBudgets && budgets.length > 0) {
      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Budget Summary', 20, currentY);
      currentY += 10;

      const budgetTableData = budgets.map(b => [
        b.name,
        b.month,
        formatCurrency(b.amount),
        formatCurrency(b.spent),
        formatCurrency(b.amount - b.spent),
        Math.round((b.spent / b.amount) * 100) + '%'
      ]);

      autoTable(doc, {
        head: [['Budget', 'Month', 'Planned', 'Spent', 'Remaining', 'Used %']],
        body: budgetTableData,
        startY: currentY,
        theme: 'striped',
        styles: { fontSize: 9 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Recent Transactions
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Transactions', 20, currentY);
    currentY += 10;

    const recentTransactions = filteredTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    const transactionTableData = recentTransactions.map(t => [
      t.date,
      t.description,
      t.categoryName,
      t.type,
      formatCurrency(t.amount)
    ]);

    autoTable(doc, {
      head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
      body: transactionTableData,
      startY: currentY,
      theme: 'striped',
      styles: { fontSize: 9 }
    });

    // Generate timestamp
    const timestamp = new Date().toLocaleString();
    const pageCount = doc.getNumberOfPages();
    
    // Add footer to all pages
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on ${timestamp}`, 20, 290);
      doc.text(`Page ${i} of ${pageCount}`, 170, 290);
    }

    // Save the PDF
    doc.save(filename);
  }

  // Export monthly financial report
  async exportMonthlyReport(
    transactions: Transaction[],
    budgets: Budget[],
    month: string,
    filename?: string
  ): Promise<void> {
    const monthDate = new Date(month + '-01');
    const nextMonth = new Date(monthDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const options: ExportOptions = {
      dateRange: {
        from: monthDate.toISOString().split('T')[0],
        to: new Date(nextMonth.getTime() - 1).toISOString().split('T')[0]
      },
      includeCategories: true,
      includeBudgets: true
    };

    const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const defaultFilename = `${monthName.replace(' ', '_')}_Report.pdf`;

    await this.exportToPDF(transactions, budgets, filename || defaultFilename, options);
  }

  // Helper method to calculate financial summary
  private calculateFinancialSummary(transactions: Transaction[]) {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      totalTransactions: transactions.length
    };
  }

  // Helper method to calculate category totals
  private calculateCategoryTotals(transactions: Transaction[]) {
    const categoryMap = new Map<string, { total: number; count: number }>();

    transactions.forEach(t => {
      const existing = categoryMap.get(t.categoryName) || { total: 0, count: 0 };
      categoryMap.set(t.categoryName, {
        total: existing.total + t.amount,
        count: existing.count + 1
      });
    });

    return Array.from(categoryMap.entries())
      .map(([categoryName, data]) => ({
        categoryName,
        total: data.total,
        count: data.count
      }))
      .sort((a, b) => b.total - a.total);
  }

  // Helper method to download files
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const exportService = new ExportService();