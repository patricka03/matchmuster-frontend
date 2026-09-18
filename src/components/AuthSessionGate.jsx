import { useEffect, useState } from 'react'
import {
  Navigate,
  useLocation,
} from 'react-router-dom'

import API_URL from '../config/api'
import {
  AUTH_CHANGED_EVENT,
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

const PUBLIC_ONLY_PATHS = new Set([
  '/',
  '/login',
  '/signup',
])

function clearCachedAccountState() {
  localStorage.removeItem('currentUser')
  localStorage.removeItem('activeTeamId')
  localStorage.removeItem('activeTeamName')
}

function AuthSessionGate({ children }) {
  const location = useLocation()

  const [sessionState, setSessionState] =
    useState('checking')

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const token = getAuthToken()

      if (!token) {
        if (!cancelled) {
          setSessionState('signed-out')
        }

        return
      }

      try {
        const response = await fetch(
          `${API_URL}/users/me`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: token,
            },
          },
        )

        if (response.status === 401) {
          await clearAuthToken()
          clearCachedAccountState()

          if (!cancelled) {
            setSessionState('signed-out')
          }

          return
        }

        if (response.ok) {
          const data = await response.json()
          const currentUser =
            data?.user || data

          if (currentUser) {
            localStorage.setItem(
              'currentUser',
              JSON.stringify(currentUser),
            )
          }
        }

        /*
         * Match StudentHelm's startup behaviour:
         * if a persisted token exists, a temporary
         * network/server problem must not dump the
         * user back on the login screen.
         *
         * Only an explicit 401 above invalidates the
         * persisted MatchMuster session.
         */
        if (!cancelled) {
          setSessionState('signed-in')
        }
      } catch (error) {
        console.warn(
          'Unable to validate the saved MatchMuster session during startup.',
          error,
        )

        if (!cancelled) {
          setSessionState('signed-in')
        }
      }
    }

    function handleAuthChanged() {
      if (cancelled) {
        return
      }

      setSessionState('checking')
      restoreSession()
    }

    restoreSession()

    window.addEventListener(
      AUTH_CHANGED_EVENT,
      handleAuthChanged,
    )

    return () => {
      cancelled = true

      window.removeEventListener(
        AUTH_CHANGED_EVENT,
        handleAuthChanged,
      )
    }
  }, [])

  if (sessionState === 'checking') {
    return (
      <main
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: '#ffffff',
        }}
        aria-busy="true"
        aria-label="Restoring MatchMuster session"
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '999px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#1d4ed8',
            animation:
              'matchmuster-session-spin 0.8s linear infinite',
          }}
        />

        <style>
          {`@keyframes matchmuster-session-spin { to { transform: rotate(360deg); } }`}
        </style>
      </main>
    )
  }

  if (
    sessionState === 'signed-in' &&
    PUBLIC_ONLY_PATHS.has(
      location.pathname,
    )
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    )
  }

  return children
}

export default AuthSessionGate
