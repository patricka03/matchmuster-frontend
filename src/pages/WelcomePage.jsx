import { Link } from 'react-router-dom'
import matchMusterLogo from '../assets/matchmuster-logo.png'
import './WelcomePage.css'

const features = [
  {
    title: 'Fixtures & Schedule',
    text: 'Keep match dates, kick-off times, meeting times, locations and team instructions together.',
  },
  {
    title: 'Player Availability',
    text: 'Players can confirm whether they are available so managers know who they can select.',
  },
  {
    title: 'Squad Selection',
    text: 'Build the matchday squad, starting XI and substitutes from the players who are available.',
  },
  {
    title: 'Match Payments',
    text: 'Request and track legitimate team-related match payments in one organised place.',
  },
  {
    title: 'Team Updates',
    text: 'Share announcements, match information and tactical updates with the team.',
  },
  {
    title: 'Training & Ratings',
    text: 'Organise training sessions and keep post-match ratings and team awards together.',
  },
]

function WelcomePage() {
  return (
    <main className="public-site">

      <header className="public-header">
        <Link
          className="public-brand"
          to="/"
          aria-label="MatchMuster home"
        >
          <img
            src={matchMusterLogo}
            alt="MatchMuster"
          />

          <span>MatchMuster</span>
        </Link>

        <nav
          className="public-nav"
          aria-label="Main navigation"
        >
          <a href="#features">
            Features
          </a>

          <a href="#about">
            About
          </a>

          <Link to="/support">
            Support
          </Link>

          <Link
            className="public-nav-login"
            to="/login"
          >
            Log In
          </Link>
        </nav>
      </header>


      <section className="public-hero">

        <div className="public-hero-copy">

          <p className="public-eyebrow">
            BUILT FOR FOOTBALL TEAMS
          </p>

          <h1>
            Run your football team without the weekly admin headache.
          </h1>

          <p className="public-hero-text">
            MatchMuster gives football managers and players one place
            to organise fixtures, availability, squads, payments,
            training, team updates and post-match ratings.
          </p>

          <div className="public-hero-actions">

            <Link
              className="public-primary-button"
              to="/signup"
            >
              Get Started
            </Link>

            <Link
              className="public-secondary-button"
              to="/login"
            >
              Log In
            </Link>

          </div>

        </div>


        <div
          className="public-hero-panel"
          aria-label="MatchMuster product overview"
        >

          <div className="public-panel-logo">

            <img
              src={matchMusterLogo}
              alt=""
              aria-hidden="true"
            />

          </div>

          <p className="public-panel-kicker">
            One place for your team
          </p>

          <ul>
            <li>Fixtures and training</li>
            <li>Availability and squad selection</li>
            <li>Team updates and notifications</li>
            <li>Match payments and ratings</li>
          </ul>

        </div>

      </section>


      <section
        className="public-section"
        id="features"
      >

        <div className="public-section-heading">

          <p className="public-eyebrow">
            WHAT MATCHMUSTER DOES
          </p>

          <h2>
            Less chasing. Less confusion. More football.
          </h2>

          <p>
            MatchMuster is designed to keep the everyday organisation
            around a football team simple for both managers and players.
          </p>

        </div>


        <div className="public-feature-grid">

          {features.map((feature) => (
            <article
              className="public-feature-card"
              key={feature.title}
            >

              <h3>
                {feature.title}
              </h3>

              <p>
                {feature.text}
              </p>

            </article>
          ))}

        </div>

      </section>


      <section className="public-section public-how-it-works">

        <div className="public-section-heading">

          <p className="public-eyebrow">
            HOW IT WORKS
          </p>

          <h2>
            Your team information, organised from one account.
          </h2>

        </div>


        <div className="public-step-grid">

          <article>

            <span>1</span>

            <h3>
              Create or join a team
            </h3>

            <p>
              Managers set up their team and players join
              the correct squad.
            </p>

          </article>


          <article>

            <span>2</span>

            <h3>
              Plan the week
            </h3>

            <p>
              Create fixtures or training and collect
              player availability.
            </p>

          </article>


          <article>

            <span>3</span>

            <h3>
              Keep matchday together
            </h3>

            <p>
              Squads, updates, payments and post-match
              information stay in one place.
            </p>

          </article>

        </div>

      </section>


      <section
        className="public-section public-about"
        id="about"
      >

        <div>

          <p className="public-eyebrow">
            ABOUT MATCHMUSTER
          </p>

          <h2>
            Football team management software built in the UK.
          </h2>

        </div>


        <div className="public-about-copy">

          <p>
            MatchMuster is operated by MATCHMUSTER LTD,
            a company registered in England and Wales.
            The platform is being built to reduce the admin
            involved in organising adult football teams and
            give managers and players a clearer place for
            team information.
          </p>

          <p>
            MatchMuster provides team-management software.
            Football teams, managers, leagues, venues and
            competitions remain responsible for the football
            activities they organise.
          </p>

        </div>

      </section>


      <section className="public-support-card">

        <div>

          <p className="public-eyebrow">
            CUSTOMER SUPPORT
          </p>

          <h2>
            Need help with MatchMuster?
          </h2>

          <p>
            Visit our public support page for help with accounts,
            team setup, payments, privacy or general questions.
          </p>

        </div>


        <Link
          className="public-primary-button"
          to="/support"
        >
          Visit Support
        </Link>

      </section>


      <footer className="public-footer">

        <div className="public-footer-company">

          <strong>
            MATCHMUSTER LTD
          </strong>

          <span>
            Company number 17400982
          </span>

          <span>
            Registered in England and Wales
          </span>

          <span>
            8 Cancell Road, London, SW9 6HN
          </span>

        </div>


        <nav
          className="public-footer-links"
          aria-label="Footer navigation"
        >

          <Link to="/support">
            Support
          </Link>

          <Link to="/legal">
            Legal
          </Link>

          <Link to="/legal/terms">
            Terms
          </Link>

          <Link to="/legal/privacy">
            Privacy
          </Link>

          <Link to="/legal/community-guidelines">
            Community Guidelines
          </Link>

        </nav>


        <p className="public-footer-copy">
          © 2026 MatchMuster. All rights reserved.
        </p>

      </footer>

    </main>
  )
}

export default WelcomePage
