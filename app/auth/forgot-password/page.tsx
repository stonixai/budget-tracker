'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { SecurityBadge, HTTPSIndicator } from '@/components/ui/SecurityBadge'
import { sanitizeInput } from '@/lib/utils'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [isSecure, setIsSecure] = useState(false)

  useState(() => {
    setIsSecure(typeof window !== 'undefined' && window.location.protocol === 'https:')
  })

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Email address is required')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: sanitizeInput(email.trim()),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'Failed to send reset email. Please try again.')
      }
    } catch (error) {
      setError('An error occurred. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Card variant="elevated" className="overflow-hidden">
            <CardBody className="text-center py-12">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 mb-6">
                <EmailSentIcon />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Check Your Email
              </h2>
              <p className="text-gray-600 mb-6">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or try again in a few minutes.
              </p>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    setSuccess(false)
                    setEmail('')
                  }}
                >
                  Try Different Email
                </Button>
                <Link href="/auth/signin">
                  <Button variant="ghost" fullWidth>
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Security Indicators */}
        <div className="mb-6 flex justify-center gap-2">
          <HTTPSIndicator isSecure={isSecure} />
          <SecurityBadge 
            status="safe" 
            message="Secure Reset" 
            tooltip="Password reset links are encrypted and expire automatically"
          />
        </div>

        <Card variant="elevated" className="overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-r from-primary-600 to-primary-700 text-white">
            <div className="mb-4">
              <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <KeyIcon />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Reset Your Password
              </h1>
              <p className="text-primary-100 mt-2">
                Enter your email to receive a secure reset link
              </p>
            </div>
          </CardHeader>
          
          <CardBody className="space-y-6">
            {error && (
              <Alert 
                variant="error" 
                title="Reset Failed"
                description={error}
                dismissible
                onDismiss={() => setError('')}
              />
            )}

            <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <InfoIcon />
                <div>
                  <p className="font-medium text-blue-800 mb-1">How it works:</p>
                  <ul className="text-blue-700 space-y-1 text-xs">
                    <li>• We'll send a secure reset link to your email</li>
                    <li>• The link expires in 1 hour for security</li>
                    <li>• Click the link to create a new password</li>
                  </ul>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="    Enter your email address"
                leftIcon={<EmailIcon />}
                autoComplete="email"
                required
                disabled={loading}
                helperText="Enter the email address associated with your account"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={loading}
                disabled={loading || !email}
                leftIcon={!loading && <KeyIcon />}
              >
                Send Reset Link
              </Button>
            </form>
            
            {/* Back to Sign In */}
            <div className="text-center pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
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
          <p className="text-xs text-gray-500 mb-2">Your security is our priority:</p>
          <div className="flex justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <ShieldIcon />
              Encrypted Links
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon />
              1-Hour Expiry
            </span>
            <span className="flex items-center gap-1">
              <LockIcon />
              Secure Process
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Icon Components
const EmailSentIcon = () => (
  <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

const KeyIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
)

const EmailIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
  </svg>
)

const InfoIcon = () => (
  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const ShieldIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 1L5 3v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V3l-5-2z" clipRule="evenodd" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const LockIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
)