import { Link, useNavigate } from 'react-router-dom'
import './Legal.css'
import matchMusterLogo from '../../assets/matchmuster-logo.png'

function LegalHubPage() {
  const navigate = useNavigate()

  function handleBack() {
    const token = localStorage.getItem('token')

    if (token) {
      navigate('/profile/edit')
    } else {
      navigate('/')
    }
  }

  const legalDocuments = [
    {
      title: 'Terms of Service',
      description: 'The rules for using MatchMuster.',
      path: '/legal/terms',
    },
    {
      title: 'Privacy Policy',
      description:
        'How MatchMuster collects, uses and protects your information.',
      path: '/legal/privacy',
    },
    {
      title: 'Community Guidelines',
      description:
        'Rules for posts, behaviour and communication.',
      path: '/legal/community-guidelines',
    },
    {
      title: 'Payments, Subscriptions & Refunds',
      description:
        'Information about subscriptions, trials, match subs and refunds.',
      path: '/legal/payments',
    },
    {
      title: 'Location & ETA Privacy',
      description:
        'How optional location and ETA information is handled.',
      path: '/legal/location',
    },
    {
      title: 'Age & Eligibility',
      description:
        'MatchMuster V1 is available only to users aged 18 or over.',
      path: '/legal/age',
    },
    {
      title: 'Account Deletion & Data Retention',
      description:
        'What happens when you delete your MatchMuster account.',
      path: '/legal/account-deletion',
    },
    {
      title: 'Reporting, Moderation & Complaints',
      description:
        'How to report users, content or problems on MatchMuster.',
      path: '/legal/reporting',
    },
    {
      title: 'Cookies & Storage',
      description:
        'How MatchMuster uses cookies and similar technologies.',
      path: '/legal/cookies',
    },
  ]

  return (
    <main className="legal-page">
      <div className="legal-container">
        <button
          type="button"
          className="app-back-button"
          onClick={handleBack}
        >
          ← Back
        </button>

        <header className="legal-header">
          <img
            className="legal-page-logo"
            src={matchMusterLogo}
            alt="MatchMuster"
          />

          <h1>Legal &amp; Privacy</h1>

          <p>
            Information about your rights, privacy and the rules
            for using MatchMuster.
          </p>
        </header>

        <div className="legal-list">
          {legalDocuments.map((document) => (
            <Link
              key={document.path}
              to={document.path}
              className="legal-card"
            >
              <div>
                <h2>{document.title}</h2>
                <p>{document.description}</p>
              </div>

              <span className="legal-arrow">›</span>
            </Link>
          ))}
        </div>

        <div className="legal-contact">
          <h2>Need help?</h2>

          <p>matchmuster.dev@gmail.com</p>
        </div>
      </div>
    </main>
  )
}

export default LegalHubPage
