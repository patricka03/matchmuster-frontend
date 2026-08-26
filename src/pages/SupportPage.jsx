import { Link } from 'react-router-dom'
import matchMusterLogo from '../assets/matchmuster-logo.png'
import './SupportPage.css'
import './SupportPage.mobile.css'

const supportTopics = [
  {
    title: 'Account & Sign In',
    text: 'Login, password resets and account access.',
  },
  {
    title: 'Teams & Membership',
    text: 'Creating or joining teams, approvals and membership.',
  },
  {
    title: 'Fixtures & Training',
    text: 'Fixtures, availability, squads and training sessions.',
  },
  {
    title: 'Match Subs & Payments',
    text: 'Payment requests, statuses and team match subs.',
  },
  {
    title: 'Privacy & Account',
    text: 'Privacy, location settings and account deletion.',
  },
  {
    title: 'General Support',
    text: 'Anything else about using MatchMuster.',
  },
]

function SupportPage() {
  return (
    <main className="support-public-page">

      <header className="support-public-header">

        <Link
          className="support-public-brand"
          to="/"
        >
          <img
            src={matchMusterLogo}
            alt="MatchMuster"
          />

          <span>
            MatchMuster
          </span>
        </Link>


        <nav aria-label="Support navigation">

          <Link to="/">
            Home
          </Link>

          <Link to="/legal">
            Legal
          </Link>

          <Link
            className="support-public-login"
            to="/login"
          >
            Log In
          </Link>

        </nav>

      </header>


      <section className="support-public-hero">

        <p className="support-eyebrow">
          MATCHMUSTER SUPPORT
        </p>

        <h1>
          How can we help?
        </h1>

        <p>
          Help with your account, team, fixtures, match subs and privacy.
        </p>

      </section>


      <section className="support-topic-grid">

        {supportTopics.map((topic) => (
          <article key={topic.title}>

            <h2>
              {topic.title}
            </h2>

            <p>
              {topic.text}
            </p>

          </article>
        ))}

      </section>


      <section className="support-contact-panel">

        <div>

          <p className="support-eyebrow">
            CONTACT SUPPORT
          </p>

          <h2>
            Contact us
          </h2>

          <p>
            Email our support team and include your account email
            if it is relevant to your question.
          </p>

        </div>


        <a
          className="support-email-button"
          href="mailto:support@matchmuster.uk"
          aria-label="Email MatchMuster support"
        >
          Email Support
        </a>

        <p className="support-email-address">
          support@matchmuster.uk
        </p>

      </section>


      <section className="support-company-panel">

        <h2>
          Company details
        </h2>

        <p>
          <strong>MATCHMUSTER LTD</strong>
        </p>

        <p>
          Company number: 17400982
        </p>

        <p>
          Registered in England and Wales
        </p>

        <p>
          Registered office:
          8 Cancell Road, London, SW9 6HN
        </p>

        <p>
          Website: www.matchmuster.uk
        </p>

      </section>


      <footer className="support-public-footer">

        <Link to="/">
          Home
        </Link>

        <Link to="/legal/terms">
          Terms of Service
        </Link>

        <Link to="/legal/privacy">
          Privacy Policy
        </Link>

        <Link to="/legal/community-guidelines">
          Community Guidelines
        </Link>

        <span>
          © 2026 MatchMuster
        </span>

      </footer>

    </main>
  )
}

export default SupportPage
