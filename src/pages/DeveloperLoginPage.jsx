import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './DeveloperLoginPage.css'
import API_URL from '../config/api'

function DeveloperLoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch(
        `${API_URL}/developer/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            developer: {
              email,
              password,
            },
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.error || 'Invalid developer email or password'
        )
      }

      const authorizationHeader =
        response.headers.get('Authorization')

      const developerToken = authorizationHeader?.replace(
        /^Bearer\s+/i,
        ''
      )

      if (!developerToken) {
        throw new Error(
          'Developer token was not returned by the server'
        )
      }

      localStorage.setItem('developerToken', developerToken)

      navigate('/developer/dashboard', {
        replace: true,
      })
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="developer-login-page">
      <section className="developer-login-card">
        <div className="developer-login-logo">MM</div>

        <p className="developer-login-label">
          PRIVATE CONTROL CENTRE
        </p>

        <h1>Developer sign in</h1>

        <p className="developer-login-intro">
          Sign in to manage the MatchMuster platform.
        </p>

        {errorMessage && (
          <div className="developer-login-error">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="developer-email">
            Email address
          </label>

          <input
            id="developer-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="developer-password">
            Password
          </label>

          <input
            id="developer-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="developer-login-notice">
          Authorised MatchMuster developers only
        </p>
      </section>
    </main>
  )
}

export default DeveloperLoginPage
