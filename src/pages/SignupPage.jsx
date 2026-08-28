import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API_URL from '../config/api'
import matchMusterLogo from '../assets/matchmuster-logo.png'
import BackButton from '../components/BackButton'
import {
  ClipboardList,
  UserRound,
  X,
} from 'lucide-react'
import { legalDocuments } from '../data/legalDocuments'
import './SignupPage.css'

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
  const [openLegalDocument, setOpenLegalDocument] =
    useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [
    showPasswordConfirmation,
    setShowPasswordConfirmation,
  ] = useState(false)

  const activeLegalDocument =
    openLegalDocument
      ? legalDocuments[openLegalDocument]
      : null

  useEffect(() => {
    if (!activeLegalDocument) return undefined

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpenLegalDocument(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeLegalDocument])

  function showLegalDocument(event, documentKey) {
    event.preventDefault()
    event.stopPropagation()
    setOpenLegalDocument(documentKey)
  }

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
        'Choose Manager or Player.',
      )
      return
    }

    if (!ageConfirmed) {
      setErrorMessage(
        'Confirm that you are 18 or older.',
      )
      return
    }

    if (!legalAccepted) {
      setErrorMessage(
        'Accept the Terms of Service and acknowledge the Privacy Policy.',
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
    <main className="auth-page signup-page">
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

        <h1>Create your account</h1>

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
            aria-pressed={
              formData.account_type === 'manager'
            }
          >
            <span
              className="account-type-icon"
              aria-hidden="true"
            >
              <ClipboardList size={24} />
            </span>

            <span className="account-type-content">
              <strong>Manager</strong>

              <small>
                Plan fixtures and run your team.
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
            aria-pressed={
              formData.account_type === 'player'
            }
          >
            <span
              className="account-type-icon"
              aria-hidden="true"
            >
              <UserRound size={24} />
            </span>

            <span className="account-type-content">
              <strong>Player</strong>

              <small>
                Join your squad and share availability.
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

        {formData.account_type ===
          'manager' && (
          <div className="signup-plus-preview-note">
            <strong>
              30-day MatchMuster Plus Preview
            </strong>

            <span>
              Starts when you create
              your first team. No
              payment required.
            </span>
          </div>
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
                autoComplete="given-name"
                autoCapitalize="words"
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
                autoComplete="family-name"
                autoCapitalize="words"
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
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="password-toggle"
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
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
                autoComplete="new-password"
                value={
                  formData.password_confirmation
                }
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="password-toggle"
                aria-label={
                  showPasswordConfirmation
                    ? 'Hide password confirmation'
                    : 'Show password confirmation'
                }
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
                  I confirm I am 18 or older.
                </strong>
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
                  <button
                    type="button"
                    className="signup-legal-inline-button"
                    onClick={(event) =>
                      showLegalDocument(event, 'terms')
                    }
                  >
                    Terms of Service
                  </button>{' '}
                  and acknowledge the{' '}
                  <button
                    type="button"
                    className="signup-legal-inline-button"
                    onClick={(event) =>
                      showLegalDocument(event, 'privacy')
                    }
                  >
                    Privacy Policy
                  </button>
                  .
                </strong>
              </span>
            </label>
          </section>

          {errorMessage && (
            <p
              className="auth-error signup-submit-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <button
            className="create-account-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Creating account...'
              : 'Create Account'}
          </button>
        </form>

        <Link
          className="signup-login-link"
          to="/login"
        >
          Log In
        </Link>
      </section>

      {activeLegalDocument && (
        <div
          className="signup-legal-sheet-backdrop"
          onClick={() =>
            setOpenLegalDocument(null)
          }
          role="presentation"
        >
          <section
            className="signup-legal-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-legal-sheet-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <header className="signup-legal-sheet-header">
              <div>
                <span>LEGAL</span>

                <h2 id="signup-legal-sheet-title">
                  {activeLegalDocument.title}
                </h2>
              </div>

              <button
                type="button"
                className="signup-legal-sheet-close"
                onClick={() =>
                  setOpenLegalDocument(null)
                }
                aria-label="Close legal document"
              >
                <X
                  size={24}
                  aria-hidden="true"
                />
              </button>
            </header>

            <div className="signup-legal-sheet-content">
              <p className="signup-legal-sheet-meta">
                Version {activeLegalDocument.version}
                {' · '}
                Effective {activeLegalDocument.effectiveDate}
              </p>

              {activeLegalDocument.sections.map(
                (section) => (
                  <section
                    className="signup-legal-sheet-section"
                    key={section.title}
                  >
                    <h3>{section.title}</h3>

                    {section.paragraphs?.map(
                      (paragraph, index) => (
                        <p key={index}>
                          {paragraph}
                        </p>
                      ),
                    )}

                    {section.items && (
                      <ul>
                        {section.items.map(
                          (item, index) => (
                            <li key={index}>
                              {item}
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </section>
                ),
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default SignupPage
