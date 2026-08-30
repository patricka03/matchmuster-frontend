import { useState } from 'react'
import { Link } from 'react-router-dom'
import './ForgotPasswordPage.css'
import './ForgotPasswordPage.mobile.css'
import './ForgotPasswordPage.slick.css'
import API_URL from '../config/api'
import matchMusterLogo from '../assets/matchmuster-logo.png'
import BackButton from '../components/BackButton'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch(
        `${API_URL}/users/password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            user: {
              email: email,
            },
          }),
        },
      )

      if (!response.ok) {
        throw new Error(
          'Unable to send password reset instructions.',
        )
      }

      setSuccessMessage(
        'If an account exists for that email, a reset link has been sent.',
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to send password reset instructions.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page forgot-password-page forgot-password-auth-page">
      <section className="auth-card forgot-password-card">
        <BackButton
          to="/login"
          label="Back to login"
        />

        <img
          className="matchmuster-page-logo"
          src={matchMusterLogo}
          alt=""
          aria-hidden="true"
        />

        <h1>Forgot your password?</h1>

        <p className="forgot-password-description">
          Enter your email and we’ll send you a reset link.
        </p>

        {successMessage && (
          <p
            className="forgot-success"
            role="status"
          >
            {successMessage}
          </p>
        )}

        {errorMessage && (
          <p
            className="forgot-error"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        <form
          className="forgot-password-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="email">
            Email address
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck="false"
            required
          />

          <button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Sending...'
              : 'Send Reset Link'}
          </button>
        </form>

        <Link className="forgot-login-link" to="/login">
          Log In
        </Link>
      </section>
    </main>
  )
}

export default ForgotPasswordPage
