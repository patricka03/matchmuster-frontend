import { useEffect, useState } from 'react'
import API_URL from '../config/api'
import {
  Bell,
  CalendarDays,
  CreditCard,
  FileText,
  LogOut,
  Menu,
  Settings,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import {
  Link,
  NavLink,
  useNavigate,
  useParams,
} from 'react-router-dom'
import matchMusterLogo from '../assets/matchmuster-logo.png'
import './navbar.css'

function Navbar({
  teamId: suppliedTeamId,
  currentUser: suppliedCurrentUser,
}) {
  const navigate = useNavigate()
  const params = useParams()

  const teamId =
    suppliedTeamId ||
    params.teamId

  const [
    currentUser,
    setCurrentUser,
  ] = useState(
    suppliedCurrentUser || null,
  )

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0)

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false)

  const [
    signingOut,
    setSigningOut,
  ] = useState(false)

  const [
    openingStripe,
    setOpeningStripe,
  ] = useState(false)

  const [
    navbarError,
    setNavbarError,
  ] = useState('')

  const isPlayer =
    currentUser?.account_type ===
    'player'

  const isManager =
    currentUser?.account_type ===
    'manager'

  const isApprovedManager =
    isManager &&
    currentUser
      ?.manager_verification_status ===
      'approved'

  /*
   * The teams endpoint only returns approved memberships.
   * Therefore, a player with a teamId is treated as approved.
   */
  const isApprovedPlayer =
    isPlayer &&
    Boolean(teamId)

  const canUseTeamNavigation =
    isApprovedPlayer ||
    isApprovedManager

  useEffect(() => {
    if (suppliedCurrentUser) {
      setCurrentUser(
        suppliedCurrentUser,
      )
    }
  }, [suppliedCurrentUser])

  useEffect(() => {
    async function loadNavbarData() {
      const token =
        localStorage.getItem(
          'token',
        )

      if (!token) return

      const headers = {
        Accept:
          'application/json',
        Authorization:
          token,
      }

      try {
        const requests = [
          fetch(
            `${API_URL}/notifications`,
            {
              headers,
            },
          ),
        ]

        if (
          !suppliedCurrentUser
        ) {
          requests.push(
            fetch(
              `${API_URL}/users/me`,
              {
                headers,
              },
            ),
          )
        }

        const responses =
          await Promise.all(
            requests,
          )

        const notificationsResponse =
          responses[0]

        if (
          notificationsResponse.status ===
          401
        ) {
          clearSession()
          return
        }

        if (
          notificationsResponse.ok
        ) {
          const notificationData =
            await notificationsResponse.json()

          const notifications =
            Array.isArray(
              notificationData,
            )
              ? notificationData
              : notificationData
                  .notifications ||
                []

          const unreadNotifications =
            notifications.filter(
              (notification) =>
                !notification.read,
            )

          setUnreadCount(
            unreadNotifications.length,
          )
        }

        const userResponse =
          responses[1]

        if (userResponse) {
          if (
            userResponse.status ===
            401
          ) {
            clearSession()
            return
          }

          if (userResponse.ok) {
            const userData =
              await userResponse.json()

            const user =
              userData.user ||
              userData

            setCurrentUser(
              user,
            )

            localStorage.setItem(
              'currentUser',
              JSON.stringify(
                user,
              ),
            )
          }
        }
      } catch {
        // Keep the navbar usable if its data cannot load.
      }
    }

    loadNavbarData()
  }, [
    navigate,
    suppliedCurrentUser,
  ])

  function clearSession() {
    localStorage.removeItem(
      'token',
    )

    localStorage.removeItem(
      'currentUser',
    )

    navigate('/login')
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  function navLinkClass({
    isActive,
  }) {
    return isActive
      ? 'navbar-link navbar-link-active'
      : 'navbar-link'
  }

  function userInitials() {
    const firstName =
      currentUser?.first_name ||
      ''

    const lastName =
      currentUser?.last_name ||
      ''

    const initials =
      `${firstName.charAt(
        0,
      )}${lastName.charAt(0)}`

    return (
      initials.toUpperCase() ||
      'U'
    )
  }

  async function handlePayments() {
    if (
      !teamId ||
      openingStripe
    ) {
      return
    }

    const token =
      localStorage.getItem(
        'token',
      )

    setOpeningStripe(true)
    setNavbarError('')
    closeMenu()

    const headers = {
      Accept:
        'application/json',
      Authorization:
        token,
    }

    try {
      const statusResponse =
        await fetch(
          `${API_URL}/teams/${teamId}/stripe_status`,
          {
            headers,
          },
        )

      if (
        statusResponse.status ===
        401
      ) {
        clearSession()
        return
      }

      const statusData =
        await statusResponse.json()

      if (
        !statusResponse.ok
      ) {
        setNavbarError(
          statusData.error ||
            'Unable to check your Stripe account.',
        )

        return
      }

      const endpoint =
        statusData.setup_complete
          ? 'stripe_dashboard'
          : 'stripe_connect'

      const stripeResponse =
        await fetch(
          `${API_URL}/teams/${teamId}/${endpoint}`,
          {
            method:
              'POST',

            headers,
          },
        )

      if (
        stripeResponse.status ===
        401
      ) {
        clearSession()
        return
      }

      const stripeData =
        await stripeResponse.json()

      if (
        !stripeResponse.ok
      ) {
        setNavbarError(
          stripeData.error ||
            'Unable to open payments.',
        )

        return
      }

      const stripeUrl =
        stripeData.dashboard_url ||
        stripeData.onboarding_url

      if (!stripeUrl) {
        setNavbarError(
          'Stripe did not provide a redirect URL.',
        )

        return
      }

      window.location.assign(
        stripeUrl,
      )
    } catch {
      setNavbarError(
        'Unable to connect to Stripe.',
      )
    } finally {
      setOpeningStripe(false)
    }
  }

  async function handleSignOut() {
    const token =
      localStorage.getItem(
        'token',
      )

    setSigningOut(true)
    closeMenu()

    try {
      await fetch(
        `${API_URL}/users/sign_out`,
        {
          method:
            'DELETE',

          headers: {
            Accept:
              'application/json',

            Authorization:
              token,
          },
        },
      )
    } catch {
      // Clear the local session even if Rails is unavailable.
    } finally {
      clearSession()
    }
  }

  return (
    <header className="main-navbar">
      <div className="navbar-container">
        <Link
          className="navbar-brand"
          to="/dashboard"
          onClick={closeMenu}
          aria-label="Go to MatchMuster dashboard"
          title="Dashboard"
        >
          <img
            className="navbar-logo"
            src={matchMusterLogo}
            alt=""
            aria-hidden="true"
          />

          {/* <span className="navbar-brand-name">
            MatchMuster
          </span> */}
        </Link>

        <button
          className="navbar-menu-button"
          type="button"
          onClick={() => {
            setMenuOpen(
              (
                currentMenuOpen,
              ) =>
                !currentMenuOpen,
            )
          }}
          aria-label={
            menuOpen
              ? 'Close navigation menu'
              : 'Open navigation menu'
          }
          aria-expanded={
            menuOpen
          }
        >
          {menuOpen ? (
            <X
              size={23}
              aria-hidden="true"
            />
          ) : (
            <Menu
              size={23}
              aria-hidden="true"
            />
          )}
        </button>

        <nav
          className={`navbar-navigation ${
            menuOpen
              ? 'navbar-navigation-open'
              : ''
          }`}
          aria-label="Main navigation"
        >
          <div className="navbar-links">
            {isApprovedManager &&
              teamId && (
                <NavLink
                  className={
                    navLinkClass
                  }
                  to="/team"
                  onClick={
                    closeMenu
                  }
                  aria-label="Team settings"
                  title="Team settings"
                >
                  <Settings
                    size={18}
                    aria-hidden="true"
                  />

                  <span>
                    Team
                  </span>
                </NavLink>
              )}

            {canUseTeamNavigation &&
              teamId && (
                <>
                  <NavLink
                    className={
                      navLinkClass
                    }
                    to={`/teams/${teamId}/squad`}
                    onClick={
                      closeMenu
                    }
                    aria-label="Squad"
                    title="Squad"
                  >
                    <Users
                      size={18}
                      aria-hidden="true"
                    />

                    <span>
                      Squad
                    </span>
                  </NavLink>

                  <NavLink
                    className={
                      navLinkClass
                    }
                    to={`/teams/${teamId}/matches`}
                    onClick={
                      closeMenu
                    }
                    aria-label="Fixtures"
                    title="Fixtures"
                  >
                    <CalendarDays
                      size={18}
                      aria-hidden="true"
                    />

                    <span>
                      Fixtures
                    </span>
                  </NavLink>

                  <NavLink
                    className={
                      navLinkClass
                    }
                    to={`/teams/${teamId}/posts`}
                    onClick={
                      closeMenu
                    }
                    aria-label="Posts"
                    title="Posts"
                  >
                    <FileText
                      size={18}
                      aria-hidden="true"
                    />

                    <span>
                      Posts
                    </span>
                  </NavLink>

                  {/* ========================================
                      TEAM AWARDS
                      Approved players + approved managers
                  ======================================== */}

                  <NavLink
                    className={
                      navLinkClass
                    }
                    to={`/teams/${teamId}/awards`}
                    onClick={
                      closeMenu
                    }
                    aria-label="Team awards"
                    title="Team awards"
                  >
                    <Trophy
                      size={18}
                      aria-hidden="true"
                    />

                    <span>
                      Awards
                    </span>
                  </NavLink>
                </>
              )}

            {isApprovedManager &&
              teamId && (
                <button
                  className="navbar-link navbar-payment-link"
                  type="button"
                  onClick={
                    handlePayments
                  }
                  disabled={
                    openingStripe
                  }
                  aria-label="Open club payments"
                  title="Payments"
                >
                  <CreditCard
                    size={18}
                    aria-hidden="true"
                  />

                  <span>
                    {openingStripe
                      ? 'Opening...'
                      : 'Payments'}
                  </span>
                </button>
              )}

            <NavLink
              className={
                navLinkClass
              }
              to="/notifications"
              onClick={
                closeMenu
              }
              aria-label={
                unreadCount > 0
                  ? `Notifications, ${unreadCount} unread`
                  : 'Notifications'
              }
              title="Notifications"
            >
              <span className="navbar-bell-wrapper">
                <Bell
                  size={19}
                  aria-hidden="true"
                />

                {unreadCount >
                  0 && (
                  <span
                    className="navbar-notification-count"
                    aria-hidden="true"
                  >
                    {unreadCount >
                    99
                      ? '99+'
                      : unreadCount}
                  </span>
                )}
              </span>

              <span>
                Notifications
              </span>
            </NavLink>
          </div>

          <div className="navbar-account">
            <Link
              className="navbar-profile-link"
              to="/profile/edit"
              onClick={
                closeMenu
              }
              aria-label="Edit profile"
              title="Edit profile"
            >
              <span
                style={{
                  display:
                    'inline-flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  width:
                    '40px',

                  height:
                    '40px',

                  minWidth:
                    '40px',

                  maxWidth:
                    '40px',

                  flex:
                    '0 0 40px',

                  overflow:
                    'hidden',

                  borderRadius:
                    '50%',

                  background:
                    'linear-gradient(135deg, #ff0a78, #4f9cff)',

                  color:
                    '#ffffff',

                  fontSize:
                    '14px',

                  fontWeight:
                    '700',
                }}
              >
                {currentUser
                  ?.avatar_url ? (
                  <img
                    src={
                      currentUser.avatar_url
                    }
                    alt="Profile"
                    width={
                      40
                    }
                    height={
                      40
                    }
                    style={{
                      display:
                        'block',

                      width:
                        '40px',

                      height:
                        '40px',

                      minWidth:
                        '40px',

                      maxWidth:
                        '40px',

                      minHeight:
                        '40px',

                      maxHeight:
                        '40px',

                      objectFit:
                        'cover',

                      objectPosition:
                        'center',

                      borderRadius:
                        '50%',
                    }}
                  />
                ) : (
                  userInitials()
                )}
              </span>

              <span className="navbar-user-details">
                <strong>
                  {currentUser
                    ?.first_name ||
                    'My account'}
                </strong>

                {currentUser
                  ?.account_type && (
                  <small>
                    {isManager
                      ? 'Manager'
                      : 'Player'}
                  </small>
                )}
              </span>
            </Link>

            <button
              className="navbar-sign-out-button"
              type="button"
              onClick={
                handleSignOut
              }
              disabled={
                signingOut
              }
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut
                size={17}
                aria-hidden="true"
              />

              <span>
                {signingOut
                  ? 'Signing out...'
                  : 'Sign out'}
              </span>
            </button>
          </div>
        </nav>
      </div>

      {navbarError && (
        <div
          className="navbar-error"
          role="alert"
        >
          {navbarError}

          <button
            type="button"
            onClick={() =>
              setNavbarError(
                '',
              )
            }
            aria-label="Dismiss error"
          >
            <X
              size={16}
              aria-hidden="true"
            />
          </button>
        </div>
      )}
    </header>
  )
}

export default Navbar
