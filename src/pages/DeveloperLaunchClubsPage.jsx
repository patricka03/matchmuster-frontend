import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import API_URL from '../config/api'

import './DeveloperLaunchClubsPage.css'
import './DeveloperLaunchClubsPage.mobile.css'

function DeveloperLaunchClubsPage() {
  const navigate =
    useNavigate()

  const [teams, setTeams] =
    useState([])

  const [query, setQuery] =
    useState('')

  const [
    appliedQuery,
    setAppliedQuery,
  ] = useState('')

  const [
    target,
    setTarget,
  ] = useState(20)

  const [
    launchCount,
    setLaunchCount,
  ] = useState(0)

  const [loading, setLoading] =
    useState(true)

  const [
    grantingTeamId,
    setGrantingTeamId,
  ] = useState(null)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('')

  const loadTeams =
    useCallback(async () => {
      const developerToken =
        localStorage.getItem(
          'developerToken',
        )

      if (!developerToken) {
        navigate(
          '/developer/login',
          { replace: true },
        )
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const params =
          new URLSearchParams()

        if (
          appliedQuery.trim()
        ) {
          params.set(
            'query',
            appliedQuery.trim(),
          )
        }

        const response =
          await fetch(
            `${API_URL}/developer/launch_clubs${
              params.toString()
                ? `?${params.toString()}`
                : ''
            }`,
            {
              headers: {
                Accept:
                  'application/json',

                Authorization:
                  `Bearer ${developerToken}`,
              },
            },
          )

        const data =
          await response
            .json()
            .catch(() => ({}))

        if (
          response.status ===
          401
        ) {
          localStorage.removeItem(
            'developerToken',
          )

          navigate(
            '/developer/login',
            { replace: true },
          )
          return
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Unable to load clubs.',
          )
        }

        setTeams(
          data.teams || [],
        )

        setTarget(
          data.launch_club_target ||
            20,
        )

        setLaunchCount(
          data.launch_club_count ||
            0,
        )
      } catch (error) {
        setErrorMessage(
          error.message,
        )
      } finally {
        setLoading(false)
      }
    }, [
      appliedQuery,
      navigate,
    ])

  useEffect(() => {
    void loadTeams()
  }, [loadTeams])

  function handleSearch(
    event,
  ) {
    event.preventDefault()

    setSuccessMessage('')
    setAppliedQuery(query)
  }

  async function grantLaunchClub(
    team,
  ) {
    const confirmed =
      window.confirm(
        `Make ${team.name} a permanent Launch Club?`,
      )

    if (!confirmed) {
      return
    }

    const developerToken =
      localStorage.getItem(
        'developerToken',
      )

    setGrantingTeamId(
      team.id,
    )

    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response =
        await fetch(
          `${API_URL}/developer/launch_clubs/${team.id}/grant`,
          {
            method: 'PATCH',

            headers: {
              Accept:
                'application/json',

              Authorization:
                `Bearer ${developerToken}`,
            },
          },
        )

      const data =
        await response
          .json()
          .catch(() => ({}))

      if (
        response.status ===
        401
      ) {
        localStorage.removeItem(
          'developerToken',
        )

        navigate(
          '/developer/login',
          { replace: true },
        )

        return
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to grant Launch Club status.',
        )
      }

      setTeams(
        (currentTeams) =>
          currentTeams.map(
            (currentTeam) =>
              currentTeam.id ===
              team.id
                ? data.team
                : currentTeam,
          ),
      )

      setLaunchCount(
        data.launch_club_count ??
          launchCount,
      )

      setSuccessMessage(
        `${team.name} is now a Launch Club.`,
      )
    } catch (error) {
      setErrorMessage(
        error.message,
      )
    } finally {
      setGrantingTeamId(null)
    }
  }

  function formatDate(value) {
    if (!value) {
      return 'No end date'
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      },
    ).format(
      new Date(value),
    )
  }

  return (
    <main className="developer-launch-page">
      <header className="developer-launch-header">
        <div>
          <p>
            PRIVATE CONTROL CENTRE
          </p>

          <h1>
            Launch Clubs
          </h1>

          <span>
            Manually recognise early
            MatchMuster clubs and give
            them Launch Plus.
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              '/developer/dashboard',
            )
          }
        >
          Control centre
        </button>
      </header>

      <section className="developer-launch-target">
        <span>
          Launch Clubs
        </span>

        <strong>
          {launchCount} / {target}
        </strong>

        <small>
          Target only — not a hard
          limit.
        </small>
      </section>

      <form
        className="developer-launch-search"
        onSubmit={handleSearch}
      >
        <label>
          Search clubs

          <input
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value,
              )
            }
            placeholder="Club name or invite code"
          />
        </label>

        <button type="submit">
          Search
        </button>
      </form>

      {errorMessage && (
        <div
          className="developer-launch-error"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          className="developer-launch-success"
          role="status"
        >
          {successMessage}
        </div>
      )}

      {loading ? (
        <div className="developer-launch-empty">
          Loading clubs...
        </div>
      ) : teams.length === 0 ? (
        <div className="developer-launch-empty">
          No clubs match this search.
        </div>
      ) : (
        <section className="developer-launch-list">
          {teams.map(
            (team) => (
              <article
                className="developer-launch-card"
                key={team.id}
              >
                <div>
                  <div className="developer-launch-name-row">
                    <h2>
                      {team.name}
                    </h2>

                    <span
                      className={
                        team.launch_club
                          ? 'launch-status launch-status--active'
                          : 'launch-status'
                      }
                    >
                      {team.launch_club
                        ? 'Launch Club'
                        : team.subscription
                            ?.plus_active
                          ? 'Plus'
                          : 'Free'}
                    </span>
                  </div>

                  <p>
                    Invite code:{' '}
                    <strong>
                      {team.invite_code}
                    </strong>
                  </p>

                  <small>
                    Owner:{' '}
                    {team.owner?.name ||
                      'Not assigned'}
                    {team.owner?.email
                      ? ` · ${team.owner.email}`
                      : ''}
                  </small>

                  <small>
                    Plan:{' '}
                    {team.subscription
                      ?.status ||
                      'free'}
                    {team.subscription
                      ?.ends_at
                      ? ` · until ${formatDate(
                          team.subscription.ends_at,
                        )}`
                      : ''}
                  </small>

                  {team.launch_club_since && (
                    <small>
                      Launch Club since{' '}
                      {formatDate(
                        team.launch_club_since,
                      )}
                    </small>
                  )}
                </div>

                <div className="developer-launch-actions">
                  <button
                    type="button"
                    disabled={
                      team.launch_club ||
                      grantingTeamId ===
                        team.id
                    }
                    onClick={() =>
                      grantLaunchClub(
                        team,
                      )
                    }
                  >
                    {grantingTeamId ===
                    team.id
                      ? 'Granting...'
                      : team.launch_club
                        ? 'Launch Club'
                        : 'Make Launch Club'}
                  </button>
                </div>
              </article>
            ),
          )}
        </section>
      )}
    </main>
  )
}

export default DeveloperLaunchClubsPage
