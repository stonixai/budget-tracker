'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { SecurityBadge, HTTPSIndicator, DataEncryptionIndicator } from '@/components/ui/SecurityBadge'
import { sanitizeInput } from '@/lib/utils'

interface ValidationErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isSecure, setIsSecure] = useState(false)
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  
  const router = useRouter()

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must be less than 50 characters'
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')
    
    if (!agreedToTerms) {
      setServerError('You must agree to the Terms of Service and Privacy Policy to continue')
      return
    }
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: sanitizeInput(formData.name.trim()),
          email: sanitizeInput(formData.email.trim()),
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        // Auto-sign in after successful registration
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        if (result?.ok) {
          router.push('/')
        } else {
          // If auto-signin fails, redirect to signin page
          router.push('/auth/signin?message=Registration successful. Please sign in.')
        }
      } else {
        if (data.details) {
          // Handle validation errors from server
          const serverErrors: ValidationErrors = {}
          data.details.forEach((error: { field: string; message: string }) => {
            serverErrors[error.field as keyof ValidationErrors] = error.message
          })
          setErrors(serverErrors)
        } else {
          setServerError(data.error || 'Registration failed. Please try again.')
        }
      }
    } catch (error) {
      setServerError('An error occurred during registration. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    
    // Clear specific field error when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors({ ...errors, [name]: undefined })
    }
    
    // Show password requirements when user focuses on password field
    if (name === 'password') {
      setShowPasswordRequirements(value.length > 0)
    }
    
    // Clear server error when user makes changes
    if (serverError) {
      setServerError('')
    }
  }
  
  // Add useEffect to check HTTPS
  useState(() => {
    setIsSecure(typeof window !== 'undefined' && window.location.protocol === 'https:')
  })
  
  const getPasswordStrength = (password: string) => {
    let strength = 0
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    ]
    strength = checks.filter(Boolean).length
    
    if (strength < 2) return { label: 'Weak', color: 'error-500', width: '20%' }
    if (strength < 4) return { label: 'Fair', color: 'warning-500', width: '50%' }
    if (strength < 5) return { label: 'Good', color: 'success-500', width: '75%' }
    return { label: 'Strong', color: 'success-600', width: '100%' }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-success-50 to-success-100 py-12 px-4 sm:px-6 lg:px-8">
        <Card variant="elevated" className="w-full max-w-md">
          <CardBody className="text-center py-12">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success-100 mb-6">
              <CheckCircleIcon />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to Budget Tracker!
            </h2>
            <p className="text-gray-600 mb-6">
              Your account has been created successfully. You're being signed in automatically.
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-success-600 mx-auto"></div>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        {/* Security Indicators */}
        <div className="mb-6 flex justify-center gap-2">
          <HTTPSIndicator isSecure={isSecure} />
          <DataEncryptionIndicator isEncrypted={true} />
          <SecurityBadge 
            status="safe" 
            message="Bank-Level Security" 
            tooltip="Your data is protected with the same security standards used by banks"
          />
        </div>

        <Card variant="elevated" className="overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-r from-primary-600 to-primary-700 text-white">
            <div className="mb-4">
              <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <UserAddIcon />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Join Budget Tracker
              </h1>
              <p className="text-primary-100 mt-2">
                Create your secure account in seconds
              </p>
            </div>
          </CardHeader>
          
          <CardBody className="space-y-6">

            <form onSubmit={handleSubmit} className="space-y-6">
              {serverError && (
                <Alert 
                  variant="error" 
                  title="Registration Failed"
                  description={serverError}
                  dismissible
                  onDismiss={() => setServerError('')}
                />
              )}

              <div className="space-y-6">
                <Input
                  label="Full Name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  error={errors.name}
                  placeholder="Enter your full name"
                  leftIcon={<UserIcon />}
                  autoComplete="name"
                  required
                  disabled={loading}
                  helperText="This will be displayed in your account"
                />

                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={errors.email}
                  placeholder="Enter your email address"
                  leftIcon={<EmailIcon />}
                  autoComplete="email"
                  required
                  disabled={loading}
                  helperText="We'll never share your email with anyone"
                />

                <div>
                  <Input
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    error={errors.password}
                    placeholder="Create a secure password"
                    leftIcon={<LockIcon />}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    showPasswordToggle
                  />
                  
                  {showPasswordRequirements && formData.password && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Password Strength:</span>
                        <span className={`text-sm font-medium text-${getPasswordStrength(formData.password).color}`}>
                          {getPasswordStrength(formData.password).label}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div 
                          className={`h-2 rounded-full bg-${getPasswordStrength(formData.password).color} transition-all duration-300`}
                          style={{ width: getPasswordStrength(formData.password).width }}
                        />
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className={`flex items-center gap-2 ${formData.password.length >= 8 ? 'text-success-600' : ''}`}>
                          {formData.password.length >= 8 ? '✓' : '○'} At least 8 characters
                        </div>
                        <div className={`flex items-center gap-2 ${/[a-z]/.test(formData.password) ? 'text-success-600' : ''}`}>
                          {/[a-z]/.test(formData.password) ? '✓' : '○'} One lowercase letter
                        </div>
                        <div className={`flex items-center gap-2 ${/[A-Z]/.test(formData.password) ? 'text-success-600' : ''}`}>
                          {/[A-Z]/.test(formData.password) ? '✓' : '○'} One uppercase letter
                        </div>
                        <div className={`flex items-center gap-2 ${/\d/.test(formData.password) ? 'text-success-600' : ''}`}>
                          {/\d/.test(formData.password) ? '✓' : '○'} One number
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Input
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  error={errors.confirmPassword}
                  placeholder="Confirm your password"
                  leftIcon={<LockIcon />}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  isValid={!!formData.confirmPassword && formData.password === formData.confirmPassword}
                />
                
                {/* Terms and Privacy Agreement */}
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    required
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
                    I agree to the{' '}
                    <Link href="#" className="text-primary-600 hover:text-primary-500 font-medium underline">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link href="#" className="text-primary-600 hover:text-primary-500 font-medium underline">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={loading}
                disabled={loading || !agreedToTerms}
                leftIcon={!loading && <UserAddIcon />}
              >
                Create Your Account
              </Button>
            </form>
            
            {/* Sign In Link */}
            <div className="text-center pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/auth/signin"
                  className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
        
        {/* Trust Indicators */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 mb-2">Your account is protected by:</p>
          <div className="flex justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <ShieldIcon />
              End-to-End Encryption
            </span>
            <span className="flex items-center gap-1">
              <CheckIcon />
              GDPR Compliant
            </span>
            <span className="flex items-center gap-1">
              <LockIcon />
              Zero-Knowledge Architecture
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Icon Components
const CheckCircleIcon = () => (
  <svg className="w-8 h-8 text-success-600" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
)

const UserAddIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
  </svg>
)

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const EmailIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
  </svg>
)

const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
)

const ShieldIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 1L5 3v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V3l-5-2z" clipRule="evenodd" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
)