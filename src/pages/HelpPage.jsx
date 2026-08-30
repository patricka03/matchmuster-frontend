import '../styles/RemainingPages.mobile.css'
import BackButton from '../components/BackButton'
import Navbar from '../components/Navbar'

import './HelpPage.css'
import './HelpPage.mobile.css'

import matchMusterLogo from '../assets/matchmuster-logo.png'

import {
  getAuthToken,
} from '../utils/authStorage'

function HelpPage() {
  const isAuthenticated =
    Boolean(getAuthToken())

  return (
    <>
      {isAuthenticated && (
        <Navbar />
      )}

      <main
        className={
          isAuthenticated
            ? 'auth-page help-page-authenticated mm-minimal-page'
            : 'auth-page mm-minimal-page'
        }
      >
        <section className="auth-card">
          {!isAuthenticated && (
            <BackButton
              to="/login"
              label="Back to login"
            />
          )}

          <img
            className="matchmuster-page-logo"
            src={matchMusterLogo}
            alt=""
            aria-hidden="true"
          />

          <h1 className={isAuthenticated ? 'mm-page-title' : undefined}>
            {isAuthenticated
              ? 'Help & support'
              : 'Need help signing in?'}
          </h1>

          <p className="auth-subtitle">
            {isAuthenticated
              ? 'Find help with your MatchMuster account and contact our support team.'
              : "If you're having trouble accessing your MatchMuster account, we're here to help."}
          </p>

          <div className="help-card">
            <h2>
              Forgot your email address?
            </h2>

            <p>
              If you can't remember the email address
              you used to create your account, please
              contact our support team. We'll help you
              recover your account after verifying your
              identity.
            </p>
          </div>

          <div className="help-card">
            <h2>
              Forgot your password?
            </h2>

            <p>
              Return to the login page and select{' '}
              <strong>
                Forgot password?
              </strong>{' '}
              to receive a password reset link.
            </p>
          </div>

          <div className="support-box">
            <p className="support-title">
              Contact Support
            </p>

            <a
              className="support-email"
              href="mailto:support@matchmuster.uk"
            >
              support@matchmuster.uk
            </a>

            <p className="support-text">
              We aim to respond as quickly as possible
              and will guide you through recovering
              access to your account.
            </p>
          </div>

          <p className="auth-footer">
            Still need help? We're always happy to
            assist.
          </p>
        </section>
      </main>
    </>
  )
}

export default HelpPage
