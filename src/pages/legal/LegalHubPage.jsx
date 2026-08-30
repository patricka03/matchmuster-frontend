import { Link } from 'react-router-dom'

import './Legal.css'

import matchMusterLogo from '../../assets/matchmuster-logo.png'
import BackButton from '../../components/BackButton'
import Navbar from '../../components/Navbar'

import {
  getAuthToken,
} from '../../utils/authStorage'

function LegalHubPage() {
  const isAuthenticated =
    Boolean(getAuthToken())

  const legalDocuments = [
    {
      title:
        'Terms of Service',

      description:
        'The rules for using MatchMuster.',

      path:
        '/legal/terms',
    },

    {
      title:
        'Privacy Policy',

      description:
        'How MatchMuster collects, uses and protects your information.',

      path:
        '/legal/privacy',
    },

    {
      title:
        'Community Guidelines',

      description:
        'Rules for posts, behaviour and communication.',

      path:
        '/legal/community-guidelines',
    },

    {
      title:
        'Payments, Subscriptions & Refunds',

      description:
        'Information about subscriptions, trials, match subs and refunds.',

      path:
        '/legal/payments',
    },

    {
      title:
        'Location & ETA Privacy',

      description:
        'How optional location and ETA information is handled.',

      path:
        '/legal/location',
    },

    {
      title:
        'Age & Eligibility',

      description:
        'MatchMuster V1 is available only to users aged 18 or over.',

      path:
        '/legal/age',
    },

    {
      title:
        'Account Deletion & Data Retention',

      description:
        'What happens when you delete your MatchMuster account.',

      path:
        '/legal/account-deletion',
    },

    {
      title:
        'Reporting, Moderation & Complaints',

      description:
        'How to report users, content or problems on MatchMuster.',

      path:
        '/legal/reporting',
    },

    {
      title:
        'Cookies & Storage',

      description:
        'How MatchMuster uses cookies and similar technologies.',

      path:
        '/legal/cookies',
    },
  ]

  return (
    <>
      {isAuthenticated && (
        <Navbar />
      )}

      <main
        className={
          isAuthenticated
            ? 'legal-page legal-page-authenticated'
            : 'legal-page'
        }
      >
        <div className="legal-container">
          {!isAuthenticated && (
            <BackButton
              to="/"
              label="Back to welcome"
            />
          )}

          <header className="legal-header">
            <img
              className="legal-page-logo"
              src={matchMusterLogo}
              alt="MatchMuster"
            />

            <h1 className="mm-page-title">
              Legal &amp; Privacy
            </h1>

            <p>
              Information about your
              rights, privacy and the
              rules for using
              MatchMuster.
            </p>
          </header>

          <div className="legal-list">
            {legalDocuments.map(
              (document) => (
                <Link
                  key={document.path}
                  to={document.path}
                  className="legal-card"
                >
                  <div>
                    <h2>
                      {document.title}
                    </h2>

                    <p>
                      {document.description}
                    </p>
                  </div>

                  <span
                    className="legal-arrow"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </Link>
              ),
            )}
          </div>

          <div className="legal-contact">
            <h2>
              Need help?
            </h2>

            <p>
              matchmuster.dev@gmail.com
            </p>
          </div>

          <footer className="legal-company-details">
            <p className="legal-company-name">
              MATCHMUSTER LTD
            </p>

            <p>
              Company number:
              17400982
            </p>

            <p>
              Registered in England
              and Wales
            </p>

            <address>
              Registered office: 8
              Cancell Road, London,
              SW9 6HN
            </address>
          </footer>
        </div>
      </main>
    </>
  )
}

export default LegalHubPage
