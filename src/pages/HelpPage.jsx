import { Link } from 'react-router-dom'
import './HelpPage.css'
import './HelpPage.mobile.css'
import matchMusterLogo from '../assets/matchmuster-logo.png'

function HelpPage() {
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

        <h1>Need help signing in?</h1>

        <p className="auth-subtitle">
          If you're having trouble accessing your MatchMuster account, we're
          here to help.
        </p>

        <div className="help-card">
          <h2>Forgot your email address?</h2>

          <p>
            If you can't remember the email address you used to create your
            account, please contact our support team. We'll help you recover
            your account after verifying your identity.
          </p>
        </div>

        <div className="help-card">
          <h2>Forgot your password?</h2>

          <p>
            Return to the login page and select <strong>Forgot password?</strong>{' '}
            to receive a password reset link.
          </p>
        </div>

        <div className="support-box">
          <p className="support-title">Contact Support</p>

          <a
            className="support-email"
            href="mailto:matchmuster.dev@gmail.com"
          >
            matchmuster.dev@gmail.com
          </a>

          <p className="support-text">
            We aim to respond as quickly as possible and will guide you through
            recovering access to your account.
          </p>
        </div>

        <p className="auth-footer">
          Still need help? We're always happy to assist.
        </p>
      </section>
    </main>
  )
}

export default HelpPage
