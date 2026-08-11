import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API_URL from '../config/api'

function SignupPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    account_type: '',
    password: '',
    password_confirmation: '',
  })

  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false)

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }))
  }

  function handleAccountType(accountType) {
    setFormData((currentFormData) => ({
      ...currentFormData,
      account_type: accountType,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setErrorMessage('')

    if (!formData.account_type) {
      setErrorMessage('Please choose whether you are a player or manager.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          user: formData,
        }),
      })

      const responseText = await response.text()
      const data = responseText ? JSON.parse(responseText) : {}

      if (!response.ok) {
        const errors = data.errors

        if (Array.isArray(errors)) {
          throw new Error(errors.join(', '))
        }

        if (errors && typeof errors === 'object') {
          throw new Error(
            Object.entries(errors)
              .map(([field, messages]) => {
                const fieldName = field.replaceAll('_', ' ')
                const errorMessages = Array.isArray(messages)
                  ? messages.join(', ')
                  : messages

                return `${fieldName} ${errorMessages}`
              })
              .join('. '),
          )
        }

        throw new Error(data.message || 'Account creation failed.')
      }

      navigate('/login', {
        state: {
          successMessage: 'Account created successfully. You can now log in.',
        },
      })

    } catch (error) {
      setErrorMessage(error.message || 'Unable to create your account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="back-link" to="/">
          ← Back
        </Link>

        <div className="logo">MM</div>

        <h1>Create your account</h1>

        <p className="auth-intro">
          Choose how you'll use MatchMuster.
        </p>

        <div className="account-type-section">
          <button
            type="button"
            className={`account-type-card ${
              formData.account_type === 'manager' ? 'selected' : ''
            }`}
            onClick={() => handleAccountType('manager')}
          >
            <span className="account-type-icon">🧑‍💼</span>

            <span className="account-type-content">
              <strong>Manager</strong>
              <small>
                Organise fixtures, manage players and run your team.
              </small>
            </span>

            <span className="account-type-check">
              {formData.account_type === 'manager' ? '✓' : ''}
            </span>
          </button>

          <button
            type="button"
            className={`account-type-card ${
              formData.account_type === 'player' ? 'selected' : ''
            }`}
            onClick={() => handleAccountType('player')}
          >
            <span className="account-type-icon">⚽</span>

            <span className="account-type-content">
              <strong>Player</strong>
              <small>
                Join your team, manage availability and stay match-ready.
              </small>
            </span>

            <span className="account-type-check">
              {formData.account_type === 'player' ? '✓' : ''}
            </span>
          </button>
        </div>

        {errorMessage && (
          <p className="auth-error" role="alert">
            {errorMessage}
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first-name">First name</label>

              <input
                id="first-name"
                name="first_name"
                type="text"
                placeholder="First name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="last-name">Last name</label>

              <input
                id="last-name"
                name="last_name"
                type="text"
                placeholder="Last name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email address</label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <div className="password-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password-confirmation">
              Confirm password
            </label>

            <div className="password-input-wrapper">
              <input
                id="password-confirmation"
                name="password_confirmation"
                type={showPasswordConfirmation ? 'text' : 'password'}
                placeholder="Enter your password again"
                value={formData.password_confirmation}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPasswordConfirmation((current) => !current)
                }
              >
                {showPasswordConfirmation ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            className="create-account-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </section>
    </main>
  )
}

export default SignupPage
