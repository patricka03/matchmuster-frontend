import { Link } from 'react-router-dom'
import matchMusterLogo from '../assets/matchmuster-logo.png'

function WelcomePage() {
  return (
    <main className="welcome-page">
      <section className="welcome-card">
        <img
          className="matchmuster-page-logo"
          src={matchMusterLogo}
          alt=""
          aria-hidden="true"
        />

        <h1>MatchMuster</h1>

        <h2>Run your football team without the chaos.</h2>

        <p>
          Fixtures, availability, team updates and match payments.
        </p>

        <p>
          All in one place.
        </p>

        <div className="welcome-buttons">
          <Link className="signup-button" to="/signup">
            Get Started
          </Link>

          <p className="login-prompt">
            Already have an account?{' '}
            <Link className="login-link" to="/login">
              Log In
            </Link>
          </p>
        </div>

        <footer className="welcome-legal-footer">
          <nav
            className="welcome-legal-links"
            aria-label="Legal information"
          >
            <Link to="/legal/terms">
              Terms
            </Link>

            <span aria-hidden="true">•</span>

            <Link to="/legal/privacy">
              Privacy
            </Link>

            <span aria-hidden="true">•</span>

            <Link to="/legal/community-guidelines">
              Community Guidelines
            </Link>
          </nav>

          <p>
            © 2026 MatchMuster
          </p>
        </footer>
      </section>
    </main>
  )
}

export default WelcomePage
