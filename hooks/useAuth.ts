'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const user = session?.user || null
  const isLoading = status === 'loading'
  const isAuthenticated = !!session && status === 'authenticated'

  const signOutUser = async () => {
    await signOut({ redirect: false })
    router.push('/auth/signin')
  }

  const redirectToSignIn = (callbackUrl?: string) => {
    const url = callbackUrl 
      ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : '/auth/signin'
    router.push(url)
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    signOut: signOutUser,
    redirectToSignIn,
    session,
  }
}