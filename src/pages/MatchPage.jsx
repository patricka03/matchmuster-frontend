import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'

function MatchPage() {
  const navigate = useNavigate()
  const { teamId, matchId } = useParams()

  const [match, setMatch] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [playerAvailability, setPlayerAvailability] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function fetchMatchPage() {
      const token = localStorage.getItem('token')

      if (!token) {
        navigate('/login')
        return
      }

      const headers = {
        Accept: 'application/json',
        Authorization: token,
      }

      setLoading(true)
      setErrorMessage('')
      setPlayerAvailability(null)

      try {
        const [matchResponse, userResponse] = await Promise.all([
          fetch(
            `${API_URL}/teams/${teamId}/matches/${matchId}`,
            { headers }
          ),
          fetch(`${API_URL}/users/me`, { headers }),
        ])

        if (
          matchResponse.status === 401 ||
          userResponse.status === 401
        ) {
          localStorage.removeItem('token')
          localStorage.removeItem('currentUser')
          navigate('/login', { replace: true })
          return
        }

        if (
          matchResponse.status === 403 ||
          userResponse.status === 403
        ) {
          navigate('/dashboard', { replace: true })
          return
        }

        const matchData = await matchResponse.json()
        const userData = await userResponse.json()

        if (!matchResponse.ok) {
          throw new Error(
            matchData.error || 'Unable to load the fixture.'
          )
        }

        if (!userResponse.ok) {
          throw new Error(
            userData.error || 'Unable to load your account.'
          )
        }

        const user = userData.user || userData

        setMatch(matchData.match || matchData)
        setCurrentUser(user)

        if (user.account_type === 'player') {
          const availabilityResponse = await fetch(
            `${API_URL}/teams/${teamId}/matches/${matchId}/availabilities/mine`,
            { headers }
          )

          if (availabilityResponse.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('currentUser')
            navigate('/login', { replace: true })
            return
          }

          if (availabilityResponse.status === 403) {
            navigate('/dashboard', { replace: true })
            return
          }

          if (availabilityResponse.ok) {
            const availabilityData =
              await availabilityResponse.json()

            setPlayerAvailability(
              availabilityData.availability || availabilityData
            )
          } else if (availabilityResponse.status !== 404) {
            const availabilityError =
              await availabilityResponse.json()

            throw new Error(
              availabilityError.error ||
                'Unable to load your availability.'
            )
          }
        }
      } catch (error) {
        setErrorMessage(
          error.message || 'Unable to connect to the server.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchMatchPage()
  }, [navigate, teamId, matchId])

  function formatKickoffTime(kickoffTime) {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(kickoffTime))
  }

  // A successful match response confirms that the user has an approved
  // membership for this team. Rails remains responsible for enforcing access.
  const isApprovedPlayer =
    currentUser?.account_type === 'player'

  const isApprovedManager =
    currentUser?.account_type === 'manager' &&
    currentUser?.manager_verification_status === 'approved'

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading fixture...
      </p>
    )
  }

  return (
    <>
      <Navbar
        teamId={teamId}
        currentUser={currentUser}
      />

      <main className="dashboard-page">
        <section className="dashboard-content">
          {errorMessage && (
            <p className="team-error" role="alert">
              {errorMessage}
            </p>
          )}

          {!errorMessage && match && (
            <>
              <BackButton
                to={`/teams/${teamId}/matches`}
                label="Back to fixtures"
              />

              <div className="dashboard-welcome">
                <p className="dashboard-label">
                  Fixture details
                </p>

                <h1>Match vs {match.opponent}</h1>

                <p>
                  View the full details for this fixture.
                </p>
              </div>

              <article className="fixture-details-card">
                <div className="fixture-details-header">
                  <span className="match-type-badge">
                    {match.match_type}
                  </span>

                  <h2>vs {match.opponent}</h2>

                  {isApprovedPlayer && (
                    <div
                      className="fixture-management-actions"
                      role="group"
                      aria-label="Player fixture actions"
                    >
                      <Link
                        className="send-availability-button"
                        to={`/teams/${teamId}/matches/${matchId}/availabilities/confirm`}
                      >
                        {playerAvailability
                          ? 'Edit availability'
                          : 'Send availability'}
                      </Link>

                      <Link
                        className="manage-payments-button"
                        to={`/teams/${teamId}/matches/${matchId}/payments`}
                      >
                        Payment status
                      </Link>
                    </div>
                  )}

                  {isApprovedManager && (
                    <div
                      className="fixture-management-actions"
                      role="group"
                      aria-label="Manager fixture actions"
                    >
                      <Link
                        className="send-availability-button"
                        to={`/teams/${teamId}/matches/${matchId}/availabilities/new`}
                      >
                        Send availability reminders
                      </Link>

                      <Link
                        className="view-availability-button"
                        to={`/teams/${teamId}/matches/${matchId}/availabilities`}
                      >
                        View availability
                      </Link>

                      <Link
                        className="select-squad-button"
                        to={`/teams/${teamId}/matches/${matchId}/squad`}
                      >
                        Select squad
                      </Link>

                      <Link
                        className="edit-match-button"
                        to={`/teams/${teamId}/matches/${matchId}/edit`}
                      >
                        Edit fixture
                      </Link>

                      <Link
                        className="cancel-fixture-button"
                        to={`/teams/${teamId}/matches/${matchId}/cancel`}
                      >
                        Cancel fixture
                      </Link>

                      <Link
                        className="manage-payments-button"
                        to={`/teams/${teamId}/matches/${matchId}/payments`}
                      >
                        Request and track payments
                      </Link>
                    </div>
                  )}
                </div>

                <div className="fixture-information">
                  <div className="fixture-information-item">
                    <span>Kick-off</span>

                    <strong>
                      {formatKickoffTime(match.kickoff_time)}
                    </strong>
                  </div>

                  <div className="fixture-information-item">
                    <span>Location</span>
                    <strong>{match.location}</strong>
                  </div>

                  <div className="fixture-information-item">
                    <span>Match type</span>

                    <strong className="capitalize-text">
                      {match.match_type}
                    </strong>
                  </div>

                  {match.description && (
                    <div className="fixture-information-item fixture-description">
                      <span>Match information</span>
                      <strong>{match.description}</strong>
                    </div>
                  )}
                </div>
              </article>
            </>
          )}
        </section>
      </main>
    </>
  )
}

export default MatchPage
