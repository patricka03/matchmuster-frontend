import '../styles/RemainingPages.mobile.css'
import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import Navbar from '../components/Navbar'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

import './SendAvailabilityPage.css'
import './SendAvailabilityPage.mobile.css'

function SendAvailabilityPage() {
  const {
    teamId,
    matchId,
  } = useParams()

  const navigate =
    useNavigate()

  const [match, setMatch] =
    useState(null)

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null)

  const [loading, setLoading] =
    useState(true)

  const [sending, setSending] =
    useState(false)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  // ========================================
  // SESSION
  // ========================================

  async function clearSendAvailabilitySession() {
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
  }

  // ========================================
  // LOAD REMINDER PAGE
  // ========================================

  useEffect(() => {
    async function loadReminderPage() {
      const token =
        getAuthToken()

      if (!token) {
        await clearSendAvailabilitySession()

        return
      }

      const headers = {
        Accept:
          'application/json',

        Authorization:
          token,
      }

      try {
        const [
          userResponse,
          matchResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/users/me`,
            {
              headers,
            },
          ),

          fetch(
            `${API_URL}/teams/${teamId}/matches/${matchId}`,
            {
              headers,
            },
          ),
        ])

        if (
          userResponse.status ===
            401 ||
          matchResponse.status ===
            401
        ) {
          await clearSendAvailabilitySession()

          return
        }

        const userData =
          await userResponse.json()

        const matchData =
          await matchResponse.json()

        if (!userResponse.ok) {
          throw new Error(
            userData.error ||
              'Unable to load your account.',
          )
        }

        if (!matchResponse.ok) {
          throw new Error(
            matchData.error ||
              'Unable to load this fixture.',
          )
        }

        const user =
          userData.user ||
          userData

        const approvedManager =
          user.account_type ===
            'manager' &&
          user.manager_verification_status ===
            'approved'

        if (!approvedManager) {
          navigate(
            `/teams/${teamId}/matches/${matchId}`,
            {
              replace: true,
            },
          )

          return
        }

        setCurrentUser(user)

        setMatch(
          matchData.match ||
            matchData,
        )
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to load this fixture.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadReminderPage()
  }, [
    matchId,
    navigate,
    teamId,
  ])

  // ========================================
  // SEND REMINDER
  // ========================================

  async function handleSendReminder() {
    const token =
      getAuthToken()

    if (!token) {
      await clearSendAvailabilitySession()

      return
    }

    setSending(true)
    setErrorMessage('')

    try {
      const response =
        await fetch(
          `${API_URL}/teams/${teamId}/matches/${matchId}/availabilities/remind`,
          {
            method: 'POST',

            headers: {
              Accept:
                'application/json',

              Authorization:
                token,
            },
          },
        )

      if (
        response.status === 401
      ) {
        await clearSendAvailabilitySession()

        return
      }

      let data = {}

      try {
        data =
          await response.json()
      } catch {
        // The response may not contain JSON.
      }

      if (!response.ok) {
        let message =
          'Unable to send the availability reminder.'

        if (
          Array.isArray(
            data.errors,
          )
        ) {
          message =
            data.errors.join(', ')
        } else if (
          data.error
        ) {
          message =
            data.error
        }

        throw new Error(
          message,
        )
      }

      navigate(
        `/teams/${teamId}/matches/${matchId}/availabilities`,
        {
          replace: true,

          state: {
            successMessage:
              data.message ||
              'Availability reminder sent.',
          },
        },
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to send the availability reminder.',
      )
    } finally {
      setSending(false)
    }
  }

  // ========================================
  // DATE / TIME
  // ========================================

  function formatKickoffTime(
    kickoffTime,
  ) {
    return new Intl.DateTimeFormat(
      'en-GB',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(
      new Date(
        kickoffTime,
      ),
    )
  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <>
        <Navbar
          teamId={teamId}
        />

        <main className="send-availability-page mm-minimal-page">
          <p className="send-availability-message">
            Loading fixture...
          </p>
        </main>
      </>
    )
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      <Navbar
        teamId={teamId}
        currentUser={
          currentUser
        }
      />

      <main className="send-availability-page mm-minimal-page">
        <section className="send-availability-container">
          {errorMessage && (
            <p
              className="send-availability-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {match && (
            <div className="send-availability-card">
              <div className="send-availability-icon">
                🔔
              </div>

              <p className="send-availability-label">
                Availability reminder
              </p>

              <h1>
                Send availability
                reminder?
              </h1>

              <p className="send-availability-description">
                This will remind
                approved players who
                have not yet submitted
                their availability for
                this fixture.
              </p>

              <div className="send-availability-fixture">
                <div>
                  <span>
                    Opponent
                  </span>

                  <strong>
                    vs{' '}
                    {match.opponent}
                  </strong>
                </div>

                <div>
                  <span>
                    Kick-off
                  </span>

                  <strong>
                    {formatKickoffTime(
                      match.kickoff_time,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Location
                  </span>

                  <strong>
                    {match.location}
                  </strong>
                </div>
              </div>

              <p className="send-availability-notice">
                Only players who have
                not responded will
                receive this reminder.
              </p>

              <div className="send-availability-actions">
                <Link
                  className="send-availability-cancel"
                  to={`/teams/${teamId}/matches/${matchId}`}
                >
                  Cancel
                </Link>

                <button
                  className="send-availability-confirm"
                  type="button"
                  onClick={
                    handleSendReminder
                  }
                  disabled={
                    sending
                  }
                >
                  {sending
                    ? 'Sending reminder...'
                    : 'Send reminder'}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  )
}

export default SendAvailabilityPage
