import { useEffect, useState } from 'react'
import {
  CalendarDays,
  CircleDollarSign,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  Repeat2,
  Scale,
  ShieldCheck,
  Check,
  Trophy,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import {
  Link,
  NavLink,
  useLocation,
} from 'react-router-dom'
import './bottomNav.css'
import './bottomNav.mobile.css'

function BottomNav({
  teamId,
  teams,
  latestPlayedMatchId,
  playerPaymentMatchId,
  canUseTeamNavigation,
  isApprovedManager,
  isApprovedPlayer,
  onTeamSwitch,
  onSignOut,
  signingOut,
  onStripeAction,
  openingStripe,
}) {
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [teamSwitcherOpen, setTeamSwitcherOpen] = useState(false)

  useEffect(() => {
    setMoreOpen(false)
    setTeamSwitcherOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!moreOpen) return undefined

    const previousBodyOverflow =
      document.body.style.overflow

    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMoreOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow =
        previousBodyOverflow

      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [moreOpen])

  const schedulePath =
    teamId
      ? `/teams/${teamId}/schedule`
      : null

  const squadPath =
    teamId
      ? `/teams/${teamId}/squad`
      : null

  const paymentTargetMatchId =
    playerPaymentMatchId

  const paymentsPath =
    isApprovedManager && teamId
      ? `/teams/${teamId}/match-subs`
      : teamId && paymentTargetMatchId
        ? `/teams/${teamId}/matches/${paymentTargetMatchId}/payments`
        : null

  const paymentsLabel =
    isApprovedManager
      ? 'Match Subs'
      : 'Pay'

  const postsPath =
    teamId
      ? `/teams/${teamId}/posts`
      : null

  const awardsPath =
    teamId
      ? `/teams/${teamId}/awards`
      : null

  const moreActive =
    location.pathname === '/team' ||
    location.pathname === '/help' ||
    location.pathname === '/legal' ||
    location.pathname.startsWith('/legal/') ||
    location.pathname === '/profile/edit' ||
    location.pathname.includes('/posts') ||
    location.pathname.includes('/awards')

  const hasMultipleTeams =
    isApprovedManager && teams.length > 1

  function activeClass({ isActive }) {
    return isActive
      ? 'bottom-nav-item active'
      : 'bottom-nav-item'
  }

  function DisabledItem({ icon, label }) {
    return (
      <span
        className="bottom-nav-item disabled"
        aria-disabled="true"
      >
        {icon}
        <small>{label}</small>
      </span>
    )
  }

  return (
    <>
      <nav
        className="bottom-nav"
        aria-label="Primary app navigation"
      >
        <div className="bottom-nav-inner">
          <NavLink
            className={activeClass}
            to="/dashboard"
          >
            <Home
              size={22}
              aria-hidden="true"
            />
            <small>Home</small>
          </NavLink>

          {canUseTeamNavigation && schedulePath ? (
            <NavLink
              className={activeClass}
              to={schedulePath}
            >
              <CalendarDays
                size={22}
                aria-hidden="true"
              />
              <small>Schedule</small>
            </NavLink>
          ) : (
            <DisabledItem
              icon={
                <CalendarDays
                  size={22}
                  aria-hidden="true"
                />
              }
              label="Schedule"
            />
          )}

          {canUseTeamNavigation && squadPath ? (
            <NavLink
              className={activeClass}
              to={squadPath}
            >
              <Users
                size={22}
                aria-hidden="true"
              />
              <small>Squad</small>
            </NavLink>
          ) : (
            <DisabledItem
              icon={
                <Users
                  size={22}
                  aria-hidden="true"
                />
              }
              label="Squad"
            />
          )}

          {canUseTeamNavigation && paymentsPath ? (
            <NavLink
              className={({ isActive }) =>
                isActive ||
                location.pathname.includes('/payments')
                  ? 'bottom-nav-item active'
                  : 'bottom-nav-item'
              }
              to={paymentsPath}
            >
              <CircleDollarSign
                size={22}
                aria-hidden="true"
              />
              <small>{paymentsLabel}</small>
            </NavLink>
          ) : (
            <DisabledItem
              icon={
                <CircleDollarSign
                  size={22}
                  aria-hidden="true"
                />
              }
              label={paymentsLabel}
            />
          )}

          <button
            className={`bottom-nav-item bottom-nav-more ${
              moreActive || moreOpen ? 'active' : ''
            }`}
            type="button"
            onClick={() =>
              setMoreOpen((current) => !current)
            }
            aria-expanded={moreOpen}
            aria-label="More"
          >
            <span className="bottom-nav-more-icon">
              <Menu
                size={22}
                aria-hidden="true"
              />
            </span>

            <small>More</small>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div
          className="bottom-nav-sheet-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setMoreOpen(false)
            }
          }}
        >
          <section
            className="bottom-nav-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
          >
            <div className="bottom-nav-sheet-handle" />

            <div className="bottom-nav-sheet-heading">
              <div>
                <span>MatchMuster</span>
                <h2>More</h2>
              </div>

              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close more menu"
              >
                <X
                  size={21}
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="bottom-nav-sheet-links">
              {hasMultipleTeams && (
                <div className="bottom-nav-team-switcher">
                  <button
                    className="bottom-nav-team-switcher-trigger"
                    type="button"
                    onClick={() =>
                      setTeamSwitcherOpen(
                        (current) => !current,
                      )
                    }
                    aria-expanded={teamSwitcherOpen}
                  >
                    <Repeat2
                      size={20}
                      aria-hidden="true"
                    />
                    <span>Switch team</span>
                    <small>
                      {teams.length} teams
                    </small>
                  </button>

                  {teamSwitcherOpen && (
                    <div
                      className="bottom-nav-team-list"
                      aria-label="Choose active team"
                    >
                      {teams.map((team) => {
                        const active =
                          String(team.id) === String(teamId)

                        return (
                          <button
                            className={
                              active
                                ? 'bottom-nav-team-option active'
                                : 'bottom-nav-team-option'
                            }
                            type="button"
                            key={team.id}
                            onClick={() => {
                              onTeamSwitch(team.id)
                              setTeamSwitcherOpen(false)
                              setMoreOpen(false)
                            }}
                            aria-pressed={active}
                          >
                            <span>
                              {team.name || `Team ${team.id}`}
                            </span>

                            {active && (
                              <Check
                                size={18}
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {canUseTeamNavigation && postsPath && (
                <Link to={postsPath}>
                  <FileText
                    size={20}
                    aria-hidden="true"
                  />
                  <span>Team updates</span>
                </Link>
              )}

              {canUseTeamNavigation && awardsPath && (
                <Link to={awardsPath}>
                  <Trophy
                    size={20}
                    aria-hidden="true"
                  />
                  <span>Ratings & MOTM</span>
                </Link>
              )}

              {canUseTeamNavigation && (
                <Link to="/team">
                  <ShieldCheck
                    size={20}
                    aria-hidden="true"
                  />
                  <span>
                    {hasMultipleTeams ? 'My teams' : 'My team'}
                  </span>
                </Link>
              )}

              {isApprovedManager &&
                canUseTeamNavigation && (
                  <button
                    type="button"
                    onClick={onStripeAction}
                    disabled={openingStripe}
                  >
                    <WalletCards
                      size={20}
                      aria-hidden="true"
                    />
                    <span>
                      {openingStripe
                        ? 'Opening Stripe...'
                        : 'Stripe account'}
                    </span>
                  </button>
                )}

              <Link to="/help">
                <HelpCircle
                  size={20}
                  aria-hidden="true"
                />
                <span>Help</span>
              </Link>

              <Link to="/legal">
                <Scale
                  size={20}
                  aria-hidden="true"
                />
                <span>Legal</span>
              </Link>

              <button
                className="bottom-nav-sheet-signout"
                type="button"
                onClick={onSignOut}
                disabled={signingOut}
              >
                <LogOut
                  size={20}
                  aria-hidden="true"
                />
                <span>
                  {signingOut
                    ? 'Signing out...'
                    : 'Sign out'}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export default BottomNav
