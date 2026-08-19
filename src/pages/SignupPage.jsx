import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API_URL from '../config/api'
import matchMusterLogo from '../assets/matchmuster-logo.png'

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

  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [legalAccepted, setLegalAccepted] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [
    showPasswordConfirmation,
    setShowPasswordConfirmation,
  ] = useState(false)

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
      setErrorMessage(
        'Please choose whether you are a player or manager.',
      )
      return
    }

    if (!ageConfirmed) {
      setErrorMessage(
        'You must confirm that you are 18 years of age or older.',
      )
      return
    }

    if (!legalAccepted) {
      setErrorMessage(
        'You must agree to the Terms of Service before creating an account.',
      )
      return
    }

    if (
      formData.password !==
      formData.password_confirmation
    ) {
      setErrorMessage('Your passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(
        `${API_URL}/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            user: formData,
            age_confirmed: ageConfirmed,
            terms_accepted: legalAccepted,
          }),
        },
      )

      const responseText = await response.text()

      const data = responseText
        ? JSON.parse(responseText)
        : {}

      if (!response.ok) {
        const errors = data.errors

        if (Array.isArray(errors)) {
          throw new Error(errors.join(', '))
        }

        if (
          errors &&
          typeof errors === 'object'
        ) {
          throw new Error(
            Object.entries(errors)
              .map(([field, messages]) => {
                const fieldName =
                  field.replaceAll('_', ' ')

                const errorMessages =
                  Array.isArray(messages)
                    ? messages.join(', ')
                    : messages

                return `${fieldName} ${errorMessages}`
              })
              .join('. '),
          )
        }

        throw new Error(
          data.message ||
            'Account creation failed.',
        )
      }

      navigate('/login', {
        state: {
          successMessage:
            'Account created successfully. You can now log in.',
        },
      })
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to create your account.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link
          className="app-back-button"
          to="/"
        >
          Back
        </Link>

        <img
          className="matchmuster-page-logo"
          src={matchMusterLogo}
          alt=""
          aria-hidden="true"
        />

        <h1>Create your account</h1>

        <p className="auth-intro">
          Choose how you'll use MatchMuster.
        </p>

        <div className="account-type-section">
          <button
            type="button"
            className={`account-type-card ${
              formData.account_type === 'manager'
                ? 'selected'
                : ''
            }`}
            onClick={() =>
              handleAccountType('manager')
            }
          >
            <span className="account-type-icon">
              🧑‍💼
            </span>

            <span className="account-type-content">
              <strong>Manager</strong>

              <small>
                Organise fixtures, manage players
                and run your team.
              </small>
            </span>

            <span className="account-type-check">
              {formData.account_type ===
              'manager'
                ? '✓'
                : ''}
            </span>
          </button>

          <button
            type="button"
            className={`account-type-card ${
              formData.account_type === 'player'
                ? 'selected'
                : ''
            }`}
            onClick={() =>
              handleAccountType('player')
            }
          >
            <span className="account-type-icon">
              ⚽
            </span>

            <span className="account-type-content">
              <strong>Player</strong>

              <small>
                Join your team, manage availability
                and stay match-ready.
              </small>
            </span>

            <span className="account-type-check">
              {formData.account_type ===
              'player'
                ? '✓'
                : ''}
            </span>
          </button>
        </div>

        {errorMessage && (
          <p
            className="auth-error"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first-name">
                First name
              </label>

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
              <label htmlFor="last-name">
                Last name
              </label>

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
            <label htmlFor="email">
              Email address
            </label>

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
            <label htmlFor="password">
              Password
            </label>

            <div className="password-input-wrapper">
              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (current) => !current,
                  )
                }
              >
                {showPassword
                  ? 'Hide'
                  : 'Show'}
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
                type={
                  showPasswordConfirmation
                    ? 'text'
                    : 'password'
                }
                placeholder="Enter your password again"
                value={
                  formData.password_confirmation
                }
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPasswordConfirmation(
                    (current) => !current,
                  )
                }
              >
                {showPasswordConfirmation
                  ? 'Hide'
                  : 'Show'}
              </button>
            </div>
          </div>

          {/* =====================================
              LEGAL ACCEPTANCE
          ===================================== */}

          <section className="signup-legal-section">
            <label className="signup-legal-option">
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(event) =>
                  setAgeConfirmed(
                    event.target.checked,
                  )
                }
              />

              <span>
                <strong>
                  I confirm that I am 18 years
                  of age or older.
                </strong>

                <small>
                  MatchMuster V1 is available
                  only to adults aged 18+.
                </small>
              </span>
            </label>

            <label className="signup-legal-option">
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(event) =>
                  setLegalAccepted(
                    event.target.checked,
                  )
                }
              />

              <span>
                <strong>
                  I agree to the{' '}
                  <Link
                    to="/legal/terms"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Terms of Service
                  </Link>{' '}
                  and acknowledge the{' '}
                  <Link
                    to="/legal/privacy"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Privacy Policy
                  </Link>
                  .
                </strong>

                <small>
                  These explain the rules for
                  using MatchMuster and how your
                  personal information is handled.
                </small>
              </span>
            </label>
          </section>

          <button
            className="create-account-button"
            type="submit"
            disabled={
              isSubmitting ||
              !ageConfirmed ||
              !legalAccepted
            }
          >
            {isSubmitting
              ? 'Creating account...'
              : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">
            Log In
          </Link>
        </p>
      </section>
    </main>
  )
}

export default SignupPage
