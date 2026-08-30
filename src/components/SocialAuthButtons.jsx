import {
  useEffect,
  useState,
} from 'react'
import {
  useNavigate,
} from 'react-router-dom'
import {
  Capacitor,
} from '@capacitor/core'
import {
  SocialLogin,
} from '@capgo/capacitor-social-login'

import API_URL from '../config/api'
import {
  setAuthToken,
} from '../utils/authStorage'
import {
  APPLE_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
} from '../config/socialAuth.generated'
import './SocialAuthButtons.css'

let initialisePromise = null

function initialiseSocialLogin() {
  if (!initialisePromise) {
    initialisePromise =
      SocialLogin.initialize({
        apple: {
          clientId: APPLE_CLIENT_ID,
        },
        google: {
          iOSClientId:
            GOOGLE_IOS_CLIENT_ID,
          mode: 'online',
        },
      })
  }

  return initialisePromise
}

function providerLabel(provider) {
  return provider === 'apple'
    ? 'Apple'
    : 'Google'
}

function extractIdToken(login) {
  return (
    login?.result?.idToken ||
    login?.result?.identityToken ||
    login?.idToken ||
    login?.identityToken ||
    null
  )
}

function validateSocialSignup({
  accountType,
  firstName,
  lastName,
  ageConfirmed,
  termsAccepted,
}) {
  if (!accountType) {
    return 'Choose Manager or Player.'
  }

  if (!firstName.trim()) {
    return 'Enter your first name.'
  }

  if (!lastName.trim()) {
    return 'Enter your last name.'
  }

  if (!ageConfirmed) {
    return 'Confirm that you are 18 or older.'
  }

  if (!termsAccepted) {
    return 'Accept the Terms of Service and acknowledge the Privacy Policy.'
  }

  return ''
}

function SocialAuthButtons({
  mode = 'login',
  accountType = '',
  firstName = '',
  lastName = '',
  ageConfirmed = false,
  termsAccepted = false,
  onError,
}) {
  const navigate = useNavigate()

  const [busyProvider, setBusyProvider] =
    useState(null)

  const native =
    Capacitor.isNativePlatform()

  useEffect(() => {
    if (!native) return

    void initialiseSocialLogin()
      .catch((error) => {
        console.error(
          'Unable to initialise social login.',
          error,
        )
      })
  }, [native])

  async function authenticate(provider) {
    if (mode === 'signup') {
      const validationError =
        validateSocialSignup({
          accountType,
          firstName,
          lastName,
          ageConfirmed,
          termsAccepted,
        })

      if (validationError) {
        onError?.(validationError)
        return
      }
    }

    if (!native) {
      onError?.(
        `${providerLabel(provider)} sign-in is available in the MatchMuster mobile app.`,
      )
      return
    }

    setBusyProvider(provider)
    onError?.('')

    try {
      await initialiseSocialLogin()

      const login =
        await SocialLogin.login({
          provider,
          options:
            provider === 'apple'
              ? {
                  scopes: [
                    'email',
                    'name',
                  ],
                }
              : {
                  scopes: [
                    'email',
                    'profile',
                  ],
                },
        })

      const idToken =
        extractIdToken(login)

      if (!idToken) {
        throw new Error(
          `${providerLabel(provider)} did not return an identity token.`,
        )
      }

      const payload = {
        provider,
        id_token: idToken,
      }

      if (mode === 'signup') {
        payload.account_type =
          accountType
        payload.first_name =
          firstName.trim()
        payload.last_name =
          lastName.trim()
        payload.age_confirmed =
          ageConfirmed
        payload.terms_accepted =
          termsAccepted
      }

      const response =
        await fetch(
          `${API_URL}/auth/social`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
              Accept:
                'application/json',
            },
            body:
              JSON.stringify(payload),
          },
        )

      const responseText =
        await response.text()

      const data =
        responseText
          ? JSON.parse(responseText)
          : {}

      if (!response.ok) {
        const validationError =
          Array.isArray(data.errors)
            ? data.errors[0]
            : null

        throw new Error(
          data.error ||
          validationError ||
          data.message ||
          `Unable to continue with ${providerLabel(provider)}.`,
        )
      }

      const token =
        response.headers.get(
          'Authorization',
        )

      if (!token) {
        throw new Error(
          'Social sign-in succeeded, but MatchMuster did not receive an authentication token.',
        )
      }

      await setAuthToken(token)

      if (data.user) {
        localStorage.setItem(
          'currentUser',
          JSON.stringify(data.user),
        )
      }

      navigate(
        '/dashboard',
        {
          replace: true,
        },
      )
    } catch (error) {
      onError?.(
        error?.message ||
        `Unable to continue with ${providerLabel(provider)}.`,
      )
    } finally {
      setBusyProvider(null)
    }
  }

  return (
    <div
      className="social-auth"
      aria-label={
        mode === 'signup'
          ? 'Create account with another provider'
          : 'Sign in with another provider'
      }
    >
      <div
        className="social-auth-divider"
        aria-hidden="true"
      >
        <span>or</span>
      </div>

      <button
        className="social-auth-button social-auth-apple"
        type="button"
        disabled={Boolean(busyProvider)}
        onClick={() =>
          authenticate('apple')
        }
      >
        <span
          className="social-auth-provider-icon"
          aria-hidden="true"
        >
          
        </span>

        {busyProvider === 'apple'
          ? 'Connecting...'
          : mode === 'signup'
            ? 'Sign up with Apple'
            : 'Sign in with Apple'}
      </button>

      <button
        className="social-auth-button social-auth-google"
        type="button"
        disabled={Boolean(busyProvider)}
        onClick={() =>
          authenticate('google')
        }
      >
        <span
          className="social-auth-google-mark"
          aria-hidden="true"
        >
          G
        </span>

        {busyProvider === 'google'
          ? 'Connecting...'
          : mode === 'signup'
            ? 'Sign up with Google'
            : 'Sign in with Google'}
      </button>
    </div>
  )
}

export default SocialAuthButtons
