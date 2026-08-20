import { Link } from 'react-router-dom'
import matchMusterLogo from '../assets/matchmuster-logo.png'
import './SupportPage.css'

const supportTopics = [
  {
    title: 'Account & Sign In',
    text: 'Help with logging in, password resets, account access and account details.',
  },
  {
    title: 'Teams & Membership',
    text: 'Questions about creating a team, joining a team, approvals and team membership.',
  },
  {
    title: 'Fixtures & Training',
    text: 'Help with fixtures, availability, matchday squads and training sessions.',
  },
  {
    title: 'Payments',
    text: 'Questions about match-sub payment requests, payment status and team-related payments.',
  },
  {
    title: 'Privacy & Account Deletion',
    text: 'Questions about personal information, privacy rights, location features and deleting your account.',
  },
  {
    title: 'General Support',
    text: 'Anything else about using MatchMuster or getting started with the platform.',
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


        <nav>

          <Link to="/">
            Home
          </Link>

          <Link to="/legal">
            Legal
          </Link>

          <Link to="/login">
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
          MatchMuster support is publicly available for customers,
          users and anyone who needs information about our football
          team-management service.
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
            Email MatchMuster
          </h2>

          <p>
            For support or general enquiries, contact us below.
            If your enquiry relates to an existing MatchMuster account,
            please include the email address associated with your account
            where appropriate.
          </p>

        </div>


        <a
          className="support-email-button"
          href="mailto:matchmuster.dev@gmail.com"
        >
          matchmuster.dev@gmail.com
        </a>

      </section>


      <section className="support-company-panel">

        <h2>
          Company information
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
