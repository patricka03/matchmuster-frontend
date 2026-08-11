import { Link } from 'react-router-dom'

function WelcomePage() {
  return (
    <main className="welcome-page">
      <section className="welcome-card">
        <div className="logo">MM</div>

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
      </section>
    </main>
  )
}

export default WelcomePage
