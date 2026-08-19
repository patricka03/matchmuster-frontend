import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import API_URL from '../config/api'
import matchMusterLogo from '../assets/matchmuster-logo.png'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const resetPasswordToken = searchParams.get('reset_password_token')

  const [formData, setFormData] = useState({
    password: '',
    password_confirmation: '',
  })

  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setErrorMessage('')

    if (!resetPasswordToken) {
      setErrorMessage('This password reset link is invalid.')
      return
    }

    if (formData.password !== formData.password_confirmation) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(
        `${API_URL}/users/password`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            user: {
              reset_password_token: resetPasswordToken,
              password: formData.password,
              password_confirmation: formData.password_confirmation,
            },
          }),
        },
      )

      const responseText = await response.text()
      const data = responseText ? JSON.parse(responseText) : {}

      if (!response.ok) {
        const errors = data.errors

        if (Array.isArray(errors)) {
          throw new Error(errors.join(', '))
        }

        throw new Error(
          data.error ||
            data.message ||
            'Unable to reset your password.',
        )
      }

      navigate('/login', {
        state: {
          successMessage:
            'Password changed successfully. You can now log in.',
        },
      })
    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to reset your password.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="app-back-button" to="/login">
          Back to login
        </Link>

        <img
          className="matchmuster-page-logo"
          src={matchMusterLogo}
          alt=""
          aria-hidden="true"
        />

        <h1>Create new password</h1>

        <p>
          Choose a new password for your MatchMuster account.
        </p>

        {errorMessage && (
          <p className="auth-error" role="alert">
            {errorMessage}
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">New password</label>

            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your new password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password-confirmation">
              Confirm new password
            </label>

            <input
              id="password-confirmation"
              name="password_confirmation"
              type="password"
              placeholder="Enter your new password again"
              value={formData.password_confirmation}
              onChange={handleChange}
              required
            />
          </div>

          <button
            className="login-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating password...' : 'Update password'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default ResetPasswordPage
