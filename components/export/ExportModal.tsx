'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { exportService, Transaction, Budget, ExportOptions } from '@/lib/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  budgets: Budget[];
}

type ExportFormat = 'csv_transactions' | 'csv_budgets' | 'pdf_report' | 'pdf_monthly';

export default function ExportModal({ isOpen, onClose, transactions, budgets }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf_report');
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeCharts: true,
    includeCategories: true,
    includeBudgets: true,
    dateRange: { from: '', to: '' },
    groupByCategory: false,
    groupByMonth: false
  });
  const [filename, setFilename] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const exportFormats = [
    {
      id: 'pdf_report' as ExportFormat,
      title: 'PDF Financial Report',
      description: 'Comprehensive financial report with charts, summaries, and transaction details',
      icon: '📄',
      defaultFilename: 'financial_report.pdf'
    },
    {
      id: 'pdf_monthly' as ExportFormat,
      title: 'PDF Monthly Report',
      description: 'Monthly financial summary with budget comparison',
      icon: '📅',
      defaultFilename: 'monthly_report.pdf'
    },
    {
      id: 'csv_transactions' as ExportFormat,
      title: 'CSV Transactions',
      description: 'All transaction data in spreadsheet format',
      icon: '📊',
      defaultFilename: 'transactions.csv'
    },
    {
      id: 'csv_budgets' as ExportFormat,
      title: 'CSV Budgets',
      description: 'Budget data with spending comparison',
      icon: '💰',
      defaultFilename: 'budgets.csv'
    }
  ];

  const currentFormat = exportFormats.find(f => f.id === selectedFormat)!;

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(null);

    try {
      const exportFilename = filename || currentFormat.defaultFilename;

      switch (selectedFormat) {
        case 'csv_transactions':
          await exportService.exportTransactionsToCSV(transactions, exportFilename, exportOptions);
          break;
          
        case 'csv_budgets':
          await exportService.exportBudgetsToCSV(budgets, exportFilename);
          break;
          
        case 'pdf_report':
          await exportService.exportToPDF(transactions, budgets, exportFilename, exportOptions);
          break;
          
        case 'pdf_monthly':
          await exportService.exportMonthlyReport(transactions, budgets, selectedMonth, exportFilename);
          break;
      }

      setSuccess(`Successfully exported ${exportFilename}`);
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const resetForm = () => {
    setSelectedFormat('pdf_report');
    setFilename('');
    setExportOptions({
      includeCharts: true,
      includeCategories: true,
      includeBudgets: true,
      dateRange: { from: '', to: '' },
      groupByCategory: false,
      groupByMonth: false
    });
    setSelectedMonth(new Date().toISOString().slice(0, 7));
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const updateExportOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions(prev => ({ ...prev, ...updates }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Export Financial Data"
      description="Choose your export format and customize the data to include"
      size="xl"
    >
      <div className="space-y-6">
        {/* Export Format Selection */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Select Export Format</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exportFormats.map((format) => (
              <Card
                key={format.id}
                className={`cursor-pointer transition-all ${
                  selectedFormat === format.id
                    ? 'ring-2 ring-primary-500 bg-primary-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  setSelectedFormat(format.id);
                  setFilename('');
                }}
              >
                <CardBody className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{format.icon}</span>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{format.title}</h5>
                      <p className="text-sm text-gray-600 mt-1">{format.description}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedFormat === format.id
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedFormat === format.id && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        {/* Filename */}
        <div>
          <Input
            label="Filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder={currentFormat.defaultFilename}
            helperText="Leave empty to use default filename"
          />
        </div>

        {/* Monthly Report Options */}
        {selectedFormat === 'pdf_monthly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        {/* Date Range Options */}
        {(selectedFormat === 'pdf_report' || selectedFormat === 'csv_transactions') && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Date Range (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={exportOptions.dateRange?.from || ''}
                  onChange={(e) => updateExportOptions({
                    dateRange: { from: e.target.value, to: exportOptions.dateRange?.to || '' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={exportOptions.dateRange?.to || ''}
                  onChange={(e) => updateExportOptions({
                    dateRange: { from: exportOptions.dateRange?.from || '', to: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* PDF Report Options */}
        {selectedFormat === 'pdf_report' && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Include in Report</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeCategories}
                  onChange={(e) => updateExportOptions({ includeCategories: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Category breakdown and analysis</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeBudgets}
                  onChange={(e) => updateExportOptions({ includeBudgets: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Budget summary and comparison</span>
              </label>
            </div>
          </div>
        )}

        {/* CSV Options */}
        {selectedFormat === 'csv_transactions' && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">CSV Options</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={exportOptions.groupByCategory}
                  onChange={(e) => updateExportOptions({ groupByCategory: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Include category summary</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={exportOptions.groupByMonth}
                  onChange={(e) => updateExportOptions({ groupByMonth: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Include monthly summary</span>
              </label>
            </div>
          </div>
        )}

        {/* Data Stats */}
        <Card className="bg-gray-50">
          <CardBody className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Data Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Transactions</p>
                <p className="font-semibold text-gray-900">{transactions.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Budgets</p>
                <p className="font-semibold text-gray-900">{budgets.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Date Range</p>
                <p className="font-semibold text-gray-900">
                  {transactions.length > 0 
                    ? `${Math.ceil((new Date(Math.max(...transactions.map(t => new Date(t.date).getTime()))).getTime() - new Date(Math.min(...transactions.map(t => new Date(t.date).getTime()))).getTime()) / (1000 * 60 * 60 * 24))} days`
                    : 'No data'
                  }
                </p>
              </div>
              <div>
                <p className="text-gray-600">Categories</p>
                <p className="font-semibold text-gray-900">
                  {new Set(transactions.map(t => t.categoryName)).size}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Alerts */}
        {error && (
          <Alert
            variant="error"
            title="Export Failed"
            description={error}
            dismissible
            onDismiss={() => setError(null)}
          />
        )}

        {success && (
          <Alert
            variant="success"
            title="Export Successful"
            description={success}
            dismissible
            onDismiss={() => setSuccess(null)}
          />
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleClose}
            variant="secondary"
            size="md"
            fullWidth
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            variant="primary"
            size="md"
            fullWidth
            isLoading={isExporting}
            disabled={isExporting || transactions.length === 0}
            leftIcon={!isExporting && <DownloadIcon />}
          >
            {isExporting ? 'Exporting...' : 'Export Data'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);