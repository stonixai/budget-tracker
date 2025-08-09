'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn, getProviders } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { SecurityBadge, HTTPSIndicator } from '@/components/ui/SecurityBadge'
import { sanitizeInput } from '@/lib/utils'

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState<any>({})
  const [isSecure, setIsSecure] = useState(false)
  const [formErrors, setFormErrors] = useState<{email?: string; password?: string}>({})
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  useEffect(() => {
    const loadProviders = async () => {
      const res = await getProviders()
      setProviders(res || {})
    }
    loadProviders()
    
    // Check if connection is secure
    setIsSecure(window.location.protocol === 'https:')
  }, [])

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      setEmail(value)
      if (formErrors.email) {
        setFormErrors(prev => ({ ...prev, email: undefined }))
      }
    } else {
      setPassword(value)
      if (formErrors.password) {
        setFormErrors(prev => ({ ...prev, password: undefined }))
      }
    }
    
    if (error) {
      setError('')
    }
  }

  const validateForm = (): boolean => {
    const errors: {email?: string; password?: string} = {}
    
    if (!email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email: sanitizeInput(email.trim()),
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password. Please check your credentials and try again.')
      } else {
        router.push(callbackUrl)
      }
    } catch (error) {
      setError('An error occurred during sign in. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = async (providerId: string) => {
    setLoading(true)
    await signIn(providerId, { callbackUrl })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Security Indicators */}
        <div className="mb-6 flex justify-center gap-2">
          <HTTPSIndicator isSecure={isSecure} />
          <SecurityBadge 
            status="safe" 
            message="Enterprise Security" 
            tooltip="Your data is protected with enterprise-grade security"
          />
        </div>

        <Card variant="elevated" className="overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-r from-primary-600 to-primary-700 text-white">
            <div className="mb-4">
              <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <SecurityIcon />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome Back
              </h1>
              <p className="text-primary-100 mt-2">
                Sign in to access your secure budget tracker
              </p>
            </div>
          </CardHeader>
          
          <CardBody className="space-y-6">
            {error && (
              <Alert 
                variant="error" 
                title="Sign In Failed"
                description={error}
                dismissible
                onDismiss={() => setError('')}
              />
            )}

            {/* OAuth Providers */}
            {Object.values(providers).some((provider: any) => provider.id !== 'credentials') && (
              <div className="space-y-3">
                {Object.values(providers).map((provider: any) => {
                  if (provider.id === 'credentials') return null
                  
                  return (
                    <Button
                      key={provider.id}
                      variant="outline"
                      size="md"
                      fullWidth
                      isLoading={loading}
                      onClick={() => handleOAuthSignIn(provider.id)}
                      disabled={loading}
                      leftIcon={<SocialIcon provider={provider.id} />}
                    >
                      Continue with {provider.name}
                    </Button>
                  )
                })}
                
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">Or sign in with email</span>
                  </div>
                </div>
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleCredentialsSignIn} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={formErrors.email}
                placeholder="Enter your email address"
                leftIcon={<EmailIcon />}
                autoComplete="email"
                required
                disabled={loading}
                helperText="We'll never share your email with anyone else"
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                error={formErrors.password}
                placeholder="Enter your password"
                leftIcon={<LockIcon />}
                autoComplete="current-password"
                required
                disabled={loading}
                showPasswordToggle
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <Link href="#" className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline transition-colors">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={loading}
                disabled={loading || !email || !password}
                leftIcon={!loading && <SignInIcon />}
              >
                Sign In Securely
              </Button>
            </form>
            {/* Sign Up Link */}
            <div className="text-center pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  href="/auth/signup"
                  className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline transition-colors"
                >
                  Create one now
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
        
        {/* Trust Indicators */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 mb-2">Your data is protected by:</p>
          <div className="flex justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <ShieldIcon />
              256-bit SSL
            </span>
            <span className="flex items-center gap-1">
              <CheckIcon />
              GDPR Compliant
            </span>
            <span className="flex items-center gap-1">
              <LockIcon />
              Data Encrypted
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Icon Components
const SecurityIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 1L5 3v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V3l-5-2z" clipRule="evenodd" />
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

const SignInIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
  </svg>
)

const SocialIcon = ({ provider }: { provider: string }) => {
  const icons: Record<string, React.ReactNode> = {
    google: (
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    github: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
      </svg>
    ),
  }
  return icons[provider] || null
}

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

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}