import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

import './TeamMatchSubsPage.css'
import './TeamMatchSubsPage.mobile.css'

function TeamMatchSubsPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()

  const [matches, setMatches] =
    useState([])
  const [loading, setLoading] =
    useState(true)
  const [errorMessage, setErrorMessage] =
    useState('')

  const redirectToLogin =
    useCallback(async () => {
      await clearAuthToken()

      localStorage.removeItem(
        'currentUser',
      )
      localStorage.removeItem(
        'activeTeamId',
      )
      localStorage.removeItem(
        'activeTeamName',
      )

      navigate('/login', {
        replace: true,
      })
    }, [navigate])

  useEffect(() => {
    let cancelled = false

    async function loadMatchSubs() {
      const token =
        getAuthToken()

      if (!token) {
        await redirectToLogin()
        return
      }

      const headers = {
        Accept:
          'application/json',
        Authorization:
          token,
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const [
          userResponse,
          teamResponse,
          matchesResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/users/me`,
            { headers },
          ),
          fetch(
            `${API_URL}/teams/${teamId}`,
            { headers },
          ),
          fetch(
            `${API_URL}/teams/${teamId}/matches`,
            { headers },
          ),
        ])

        if (
          [
            userResponse,
            teamResponse,
            matchesResponse,
          ].some(
            (response) =>
              response.status ===
              401,
          )
        ) {
          await redirectToLogin()
          return
        }

        const [
          userData,
          teamData,
          matchesData,
        ] = await Promise.all([
          userResponse
            .json()
            .catch(() => ({})),
          teamResponse
            .json()
            .catch(() => ({})),
          matchesResponse
            .json()
            .catch(() => ([])),
        ])

        const user =
          userData.user ||
          userData

        const team =
          teamData.team ||
          teamData

        const isManager =
          user.account_type ===
            'manager' &&
          user
            .manager_verification_status ===
            'approved' &&
          team.membership_role ===
            'manager'

        if (!isManager) {
          navigate(
            '/dashboard',
            {
              replace: true,
            },
          )
          return
        }

        if (
          !matchesResponse.ok
        ) {
          throw new Error(
            matchesData.error ||
              'Unable to load fixtures.',
          )
        }

        const fixtureList =
          Array.isArray(
            matchesData,
          )
            ? matchesData
            : matchesData.matches ||
              []

        const withPayments =
          await Promise.all(
            fixtureList.map(
              async (match) => {
                const response =
                  await fetch(
                    `${API_URL}/teams/${teamId}/matches/${match.id}/match_payments`,
                    { headers },
                  )

                if (!response.ok) {
                  return {
                    ...match,
                    paymentCounts: {
                      all: 0,
                      paid: 0,
                      pending: 0,
                      waived: 0,
                    },
                  }
                }

                const data =
                  await response.json()

                const payments =
                  Array.isArray(data)
                    ? data
                    : data
                        .match_payments ||
                      []

                const paymentCounts =
                  payments.reduce(
                    (
                      counts,
                      payment,
                    ) => {
                      counts.all += 1

                      if (
                        counts[
                          payment.status
                        ] !== undefined
                      ) {
                        counts[
                          payment.status
                        ] += 1
                      }

                      return counts
                    },
                    {
                      all: 0,
                      paid: 0,
                      pending: 0,
                      waived: 0,
                    },
                  )

                return {
                  ...match,
                  paymentCounts,
                }
              },
            ),
          )

        if (!cancelled) {
          setMatches(
            withPayments,
          )
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error.message ||
              'Unable to load Match Subs.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadMatchSubs()

    return () => {
      cancelled = true
    }
  }, [
    navigate,
    redirectToLogin,
    teamId,
  ])

  const sortedMatches =
    useMemo(() => {
      return [...matches].sort(
        (
          firstMatch,
          secondMatch,
        ) =>
          new Date(
            secondMatch
              .kickoff_time,
          ).getTime() -
          new Date(
            firstMatch
              .kickoff_time,
          ).getTime(),
      )
    }, [matches])

  const focusMatchId =
    useMemo(() => {
      const now =
        Date.now()

      const latestStarted =
        sortedMatches.find(
          (match) =>
            new Date(
              match.kickoff_time,
            ).getTime() <= now,
        )

      if (latestStarted) {
        return latestStarted.id
      }

      const nextFixture =
        [...sortedMatches]
          .filter(
            (match) =>
              new Date(
                match.kickoff_time,
              ).getTime() >
              now,
          )
          .sort(
            (
              firstMatch,
              secondMatch,
            ) =>
              new Date(
                firstMatch
                  .kickoff_time,
              ).getTime() -
              new Date(
                secondMatch
                  .kickoff_time,
              ).getTime(),
          )[0]

      return (
        nextFixture?.id ||
        null
      )
    }, [sortedMatches])

  function formatFixtureDate(
    value,
  ) {
    return new Intl.DateTimeFormat(
      'en-GB',
      {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(
      new Date(value),
    )
  }

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading Match Subs...
      </p>
    )
  }

  return (
    <>
      <Navbar teamId={teamId} />

      <main className="dashboard-page team-match-subs-page">
        <section className="dashboard-content">
          <BackButton />

          <header className="dashboard-welcome">
            <p className="dashboard-label">
              Manager
            </p>

            <h1>
              Match Subs
            </h1>

            <p>
              Payment status by fixture.
            </p>
          </header>

          {errorMessage && (
            <p
              className="team-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {!errorMessage &&
            sortedMatches.length ===
              0 && (
              <section className="match-subs-empty">
                <h2>
                  No fixtures yet
                </h2>

                <p>
                  Create a fixture to
                  start Match Subs.
                </p>
              </section>
            )}

          <div className="match-subs-fixture-list">
            {sortedMatches.map(
              (match) => {
                const counts =
                  match.paymentCounts ||
                  {}

                const isFocus =
                  String(
                    focusMatchId,
                  ) ===
                  String(
                    match.id,
                  )

                return (
                  <button
                    type="button"
                    className={
                      isFocus
                        ? 'match-subs-fixture-card active'
                        : 'match-subs-fixture-card'
                    }
                    key={match.id}
                    onClick={() =>
                      navigate(
                        `/teams/${teamId}/matches/${match.id}/payments`,
                      )
                    }
                  >
                    <div className="match-subs-fixture-copy">
                      <div>
                        {isFocus && (
                          <span className="match-subs-current">
                            Current
                          </span>
                        )}

                        <strong>
                          vs{' '}
                          {
                            match.opponent
                          }
                        </strong>

                        <span>
                          {formatFixtureDate(
                            match
                              .kickoff_time,
                          )}
                        </span>
                      </div>

                      <span className="match-subs-open">
                        Open
                      </span>
                    </div>

                    <div className="match-subs-counts">
                      <span>
                        <strong>
                          {
                            counts.all ||
                            0
                          }
                        </strong>
                        Sent
                      </span>

                      <span>
                        <strong>
                          {
                            counts.paid ||
                            0
                          }
                        </strong>
                        Paid
                      </span>

                      <span>
                        <strong>
                          {
                            counts.pending ||
                            0
                          }
                        </strong>
                        Outstanding
                      </span>
                    </div>
                  </button>
                )
              },
            )}
          </div>
        </section>
      </main>
    </>
  )
}

export default TeamMatchSubsPage
