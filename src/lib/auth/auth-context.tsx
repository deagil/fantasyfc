import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useServerFn } from "@tanstack/react-start"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"

import { getAuthUser, signOutServer } from "@/lib/auth/auth-fns"
import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import type { AuthUser, Profile } from "@/lib/auth/types"

type AuthContextValue = {
  user: AuthUser | null
  profile: Profile | null
  isLoggedIn: boolean
  isInitializing: boolean
  error: string | null
  sendCode: (email: string) => Promise<boolean>
  verifyCode: (email: string, token: string) => Promise<boolean>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function sessionUser(session: Session | null): AuthUser | null {
  if (!session?.user) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email ?? null,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchAuthUser = useServerFn(getAuthUser)
  const signOutFn = useServerFn(signOutServer)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const syncProfileFromServer = useCallback(async () => {
    const result = await fetchAuthUser()
    setUser(result?.user ?? null)
    setProfile(result?.profile ?? null)
    return result
  }, [fetchAuthUser])

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    let mounted = true

    const deferServerSync = () => {
      // Never await inside onAuthStateChange — Supabase holds an internal lock
      // and async auth calls from the callback deadlock the client.
      queueMicrotask(() => {
        if (!mounted) {
          return
        }

        void syncProfileFromServer().catch(() => {
          // Keep the session user from the callback if the server round-trip fails.
        })
      })
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) {
        return
      }

      if (event === "INITIAL_SESSION") {
        setIsInitializing(false)
      }

      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null)
        setProfile(null)
        return
      }

      setUser(sessionUser(session))

      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "USER_UPDATED"
      ) {
        deferServerSync()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [syncProfileFromServer])

  const sendCode = useCallback(async (email: string) => {
    setError(null)
    const supabase = createBrowserSupabaseClient()
    const { error: sendError } = await supabase.auth.signInWithOtp({ email })

    if (sendError) {
      setError("Could not send code. Try again.")
      return false
    }

    return true
  }, [])

  const verifyCode = useCallback(async (email: string, token: string) => {
    setError(null)
    const supabase = createBrowserSupabaseClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    })

    if (verifyError) {
      setError("Invalid or expired code. Try again.")
      return false
    }

    return true
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    try {
      await signOutFn()
    } catch {
      // Browser session is already cleared.
    }
    setUser(null)
    setProfile(null)
  }, [signOutFn])

  const value = useMemo(
    () => ({
      user,
      profile,
      isLoggedIn: user !== null,
      isInitializing,
      error,
      sendCode,
      verifyCode,
      signOut,
    }),
    [user, profile, isInitializing, error, sendCode, verifyCode, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
