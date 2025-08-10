'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface Category {
  id: number;
  name: string;
  color: string;
  type: 'income' | 'expense';
}

interface GoalCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goal?: {
    id: number;
    name: string;
    description?: string;
    targetAmount: number;
    currentAmount: number;
    targetDate?: string;
    categoryId?: number;
    priority: string;
    color: string;
    icon?: string;
  } | null;
}

export function GoalCreationWizard({ 
  isOpen, 
  onClose, 
  onSuccess, 
  goal 
}: GoalCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    categoryId: '',
    priority: 'medium',
    color: '#6366f1',
    icon: '',
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        description: goal.description || '',
        targetAmount: (goal.targetAmount / 100).toString(),
        currentAmount: (goal.currentAmount / 100).toString(),
        targetDate: goal.targetDate ? goal.targetDate.split('T')[0] : '',
        categoryId: goal.categoryId?.toString() || '',
        priority: goal.priority,
        color: goal.color,
        icon: goal.icon || '',
      });
    } else {
      // Reset form for new goal
      setFormData({
        name: '',
        description: '',
        targetAmount: '',
        currentAmount: '0',
        targetDate: '',
        categoryId: '',
        priority: 'medium',
        color: '#6366f1',
        icon: '',
      });
    }
    setCurrentStep(1);
  }, [goal, isOpen]);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.targetAmount) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        targetAmount: parseFloat(formData.targetAmount),
        currentAmount: parseFloat(formData.currentAmount) || 0,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
        targetDate: formData.targetDate || null,
      };

      const url = '/api/goals';
      const method = goal ? 'PUT' : 'POST';
      
      const body = goal 
        ? { id: goal.id, ...submitData }
        : submitData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save goal');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving goal:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const goalTemplates = [
    { name: 'Emergency Fund', targetAmount: '10000', description: 'Build a safety net for unexpected expenses', icon: '🛡️', color: '#ef4444' },
    { name: 'Vacation Fund', targetAmount: '5000', description: 'Save for your dream vacation', icon: '✈️', color: '#3b82f6' },
    { name: 'New Car', targetAmount: '25000', description: 'Save for a reliable vehicle', icon: '🚗', color: '#10b981' },
    { name: 'Home Down Payment', targetAmount: '50000', description: 'Save for your first home', icon: '🏠', color: '#8b5cf6' },
    { name: 'Wedding Fund', targetAmount: '15000', description: 'Plan your perfect wedding', icon: '💍', color: '#ec4899' },
    { name: 'Education Fund', targetAmount: '20000', description: 'Invest in your future education', icon: '🎓', color: '#f59e0b' },
  ];

  const priorityOptions = [
    { value: 'high', label: 'High Priority', color: 'text-red-600', description: 'Critical financial goal' },
    { value: 'medium', label: 'Medium Priority', color: 'text-yellow-600', description: 'Important but not urgent' },
    { value: 'low', label: 'Low Priority', color: 'text-green-600', description: 'Nice to have' },
  ];

  const colorOptions = [
    '#6366f1', '#ef4444', '#10b981', '#f59e0b', '#3b82f6', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'
  ];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={goal ? 'Edit Financial Goal' : 'Create Financial Goal'}
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 py-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Headers */}
        <div className="text-center">
          {currentStep === 1 && <h3 className="text-lg font-semibold">Goal Details</h3>}
          {currentStep === 2 && <h3 className="text-lg font-semibold">Financial Information</h3>}
          {currentStep === 3 && <h3 className="text-lg font-semibold">Preferences & Priority</h3>}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Goal Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Quick Templates */}
            {!goal && (
              <div>
                <label className="block text-sm font-medium mb-3">Choose a Template (Optional)</label>
                <div className="grid grid-cols-2 gap-3">
                  {goalTemplates.map((template, index) => (
                    <Card
                      key={index}
                      className="p-3 cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-blue-200"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        name: template.name,
                        targetAmount: template.targetAmount,
                        description: template.description,
                        color: template.color,
                        icon: template.icon,
                      }))}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-gray-600">${template.targetAmount}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="text-center text-sm text-gray-500 my-4">or create a custom goal</div>
              </div>
            )}

            {/* Goal Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Goal Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Emergency Fund, New Car, Vacation"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this goal means to you..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium mb-2">Icon (Optional)</label>
              <Input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="e.g., 🎯, 🏠, 🚗, ✈️"
                maxLength={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use an emoji to represent your goal
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Financial Information */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Target Amount */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Target Amount <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.targetAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
                placeholder="10000.00"
                required
              />
            </div>

            {/* Current Amount */}
            <div>
              <label className="block text-sm font-medium mb-2">Current Amount</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.currentAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, currentAmount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Target Date */}
            <div>
              <label className="block text-sm font-medium mb-2">Target Date (Optional)</label>
              <Input
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                When would you like to achieve this goal?
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Preferences & Priority */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-3">Priority Level</label>
              <div className="space-y-2">
                {priorityOptions.map((option) => (
                  <label key={option.value} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value={option.value}
                      checked={formData.priority === option.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                      className="mr-3"
                    />
                    <div>
                      <div className={`font-medium ${option.color}`}>
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-600">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium mb-2">Goal Color</label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium mb-2">Preview</label>
              <Card className="p-4 border-l-4" style={{ borderLeftColor: formData.color }}>
                <div className="flex items-center gap-3">
                  {formData.icon && <span className="text-lg">{formData.icon}</span>}
                  <div>
                    <h4 className="font-semibold">{formData.name || 'Your Goal Name'}</h4>
                    {formData.description && (
                      <p className="text-sm text-gray-600">{formData.description}</p>
                    )}
                    <div className="text-sm text-gray-600 mt-1">
                      Target: ${formData.targetAmount || '0.00'}
                      {formData.targetDate && (
                        <span> • Due: {new Date(formData.targetDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrev}>
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            
            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creating...' : (goal ? 'Update Goal' : 'Create Goal')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}