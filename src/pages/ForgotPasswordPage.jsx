import { useState } from 'react'
import { Link } from 'react-router-dom'
import './ForgotPasswordPage.css'
import './ForgotPasswordPage.mobile.css'
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
        'Password reset instructions have been sent. Please check your email.',
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
    <main className="forgot-password-page">
      <section className="forgot-password-card">
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
          Enter the email address linked to your
          MatchMuster account and we'll send you a link
          to reset your password.
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
            placeholder="you@example.com"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
          />

          <button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Sending instructions...'
              : 'Send reset link'}
          </button>
        </form>

        <p className="forgot-password-footer">
          Remembered your password?{' '}
          <Link to="/login">
            Log in
          </Link>
        </p>
      </section>
    </main>
  )
}

export default ForgotPasswordPage
