import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import API_URL from '../config/api'

function MatchesPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()

  const [matches, setMatches] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function fetchMatchesPage() {
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

      try {
        const [matchesResponse, userResponse] = await Promise.all([
          fetch(`${API_URL}/teams/${teamId}/matches`, {
            headers,
          }),
          fetch(`${API_URL}/users/me`, { headers }),
        ])

        if (
          matchesResponse.status === 401 ||
          userResponse.status === 401
        ) {
          localStorage.removeItem('token')
          localStorage.removeItem('currentUser')
          navigate('/login')
          return
        }

        if (
          matchesResponse.status === 403 ||
          userResponse.status === 403
        ) {
          navigate('/dashboard')
          return
        }

        const matchesData = await matchesResponse
          .json()
          .catch(() => ({}))

        const userData = await userResponse
          .json()
          .catch(() => ({}))

        if (!matchesResponse.ok) {
          setErrorMessage(
            matchesData.error || 'Unable to load matches.'
          )
          return
        }

        if (!userResponse.ok) {
          setErrorMessage(
            userData.error || 'Unable to load your account.'
          )
          return
        }

        const user = userData.user || userData
        const isPlayer = user.account_type === 'player'
        const isApprovedManager =
          user.account_type === 'manager' &&
          user.manager_verification_status === 'approved'

        if (!isPlayer && !isApprovedManager) {
          navigate('/dashboard')
          return
        }

        const receivedMatches = Array.isArray(matchesData)
          ? matchesData
          : matchesData.matches || []

        const upcomingMatches = receivedMatches
          .filter((match) => {
            const kickoffTime = new Date(match.kickoff_time)

            return (
              !Number.isNaN(kickoffTime.getTime()) &&
              kickoffTime >= new Date()
            )
          })
          .sort(
            (firstMatch, secondMatch) =>
              new Date(firstMatch.kickoff_time) -
              new Date(secondMatch.kickoff_time)
          )

        setCurrentUser(user)
        setMatches(upcomingMatches)
      } catch {
        setErrorMessage('Unable to connect to the server.')
      } finally {
        setLoading(false)
      }
    }

    fetchMatchesPage()
  }, [navigate, teamId])

  function formatKickoffTime(kickoffTime) {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(kickoffTime))
  }

  const isManager =
    currentUser?.account_type === 'manager' &&
    currentUser?.manager_verification_status === 'approved'

  if (loading) {
    return (
      <p className="dashboard-message">Loading matches...</p>
    )
  }

  return (
    <>
      <Navbar teamId={teamId} currentUser={currentUser} />

      <main className="dashboard-page">
        <section className="dashboard-content">
          <div className="matches-heading">
            <div className="dashboard-welcome">
              <p className="dashboard-label">Fixtures</p>
              <h1>Upcoming matches</h1>
              <p>
                {isManager
                  ? 'View and manage your team’s upcoming fixtures.'
                  : 'View your team’s upcoming fixtures.'}
              </p>
            </div>

            {isManager && (
              <button
                className="create-match-button"
                type="button"
                onClick={() =>
                  navigate(`/teams/${teamId}/matches/new`)
                }
              >
                Create fixture
              </button>
            )}
          </div>

          {errorMessage && (
            <p className="team-error" role="alert">
              {errorMessage}
            </p>
          )}

          {!errorMessage && matches.length === 0 && (
            <article className="empty-team-card">
              <div className="card-icon">📅</div>
              <h2>No upcoming matches</h2>

              <p>
                {isManager
                  ? 'Create your first fixture to notify your squad.'
                  : 'Your manager has not scheduled a fixture yet.'}
              </p>

              {isManager && (
                <button
                  className="create-match-button"
                  type="button"
                  onClick={() =>
                    navigate(`/teams/${teamId}/matches/new`)
                  }
                >
                  Create fixture
                </button>
              )}
            </article>
          )}

          {!errorMessage && matches.length > 0 && (
            <section className="matches-list">
              {matches.map((match) => (
                <article className="match-card" key={match.id}>
                  <div className="match-date">
                    <span>Kick-off</span>

                    <strong>
                      {formatKickoffTime(match.kickoff_time)}
                    </strong>
                  </div>

                  <div className="match-details">
                    <span className="match-type-badge">
                      {match.match_type}
                    </span>

                    <h2>vs {match.opponent}</h2>
                    <p>📍 {match.location}</p>
                  </div>

                  <button
                    className="view-match-button"
                    type="button"
                    onClick={() =>
                      navigate(
                        `/teams/${teamId}/matches/${match.id}`
                      )
                    }
                  >
                    View fixture
                  </button>
                </article>
              ))}
            </section>
          )}
        </section>
      </main>
    </>
  )
}

export default MatchesPage
