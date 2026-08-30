import { useState } from 'react'
import { Link, useLocation, useNavigate, } from 'react-router-dom'
import API_URL from '../config/api'
import matchMusterLogo from '../assets/matchmuster-logo.png'
import { setAuthToken, } from '../utils/authStorage'
import BackButton from '../components/BackButton'
import SocialAuthButtons from '../components/SocialAuthButtons'
import './LoginPage.css'

function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const successMessage =
    location.state?.successMessage

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [errorMessage, setErrorMessage] =
    useState('')

  const [isSubmitting, setIsSubmitting] =
    useState(false)

  const [showPassword, setShowPassword] =
    useState(false)

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
    setIsSubmitting(true)

    try {
      const response = await fetch(
        `${API_URL}/users/sign_in`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },

          body: JSON.stringify({
            user: formData,
          }),
        },
      )

      const responseText =
        await response.text()

      const data = responseText
        ? JSON.parse(responseText)
        : {}

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            'Invalid email or password.',
        )
      }

      const token =
        response.headers.get(
          'Authorization',
        )

      if (!token) {
        throw new Error(
          'Login succeeded, but no authentication token was received.',
        )
      }

      /*
       * Website:
       * authStorage keeps the existing
       * browser behaviour.
       *
       * iOS / Android:
       * authStorage saves the JWT in
       * secure native storage instead
       * of normal localStorage.
       */
      await setAuthToken(token)

      navigate('/dashboard')
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to log in.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page login-page">
      <section className="auth-card">
        <BackButton
          to="/"
          label="Back to welcome"
        />
        <img
          className="matchmuster-page-logo"
          src={matchMusterLogo}
          alt=""
          aria-hidden="true"
        />

        <h1>Welcome back</h1>

        {successMessage && (
          <p
            className="auth-success"
            role="status"
          >
            {successMessage}
          </p>
        )}

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
          <div className="form-group">
            <label htmlFor="email">
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck="false"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <div className="password-label-row">
              <label htmlFor="password">
                Password
              </label>

              <Link
                className="forgot-password-link"
                to="/forgot-password"
              >
                Forgot password?
              </Link>
            </div>

            <div className="password-input-wrapper">
              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                autoComplete="current-password"
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

          <button
            className="login-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Logging in...'
              : 'Log In'}
          </button>
        </form>

        <SocialAuthButtons
          mode="login"
          onError={setErrorMessage}
        />

        <div className="login-secondary-actions">
          <Link
            className="login-help-link"
            to="/help"
          >
            Need help signing in?
          </Link>

          <Link
            className="login-create-account-link"
            to="/signup"
          >
            Create Account
          </Link>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
