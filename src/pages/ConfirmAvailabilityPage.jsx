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

function ConfirmAvailabilityPage() {
  const navigate = useNavigate()
  const { teamId, matchId } =
    useParams()

  const [match, setMatch] =
    useState(null)

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState('')

  const [loading, setLoading] =
    useState(true)

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  const [
    existingAvailability,
    setExistingAvailability,
  ] = useState(null)

  // ========================================
  // SESSION
  // ========================================

  async function clearConfirmAvailabilitySession() {
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
  // LOAD MATCH + EXISTING AVAILABILITY
  // ========================================

  useEffect(() => {
    async function fetchMatch() {
      const token =
        getAuthToken()

      if (!token) {
        await clearConfirmAvailabilitySession()

        return
      }

      try {
        const response =
          await fetch(
            `${API_URL}/teams/${teamId}/matches/${matchId}`,
            {
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
          await clearConfirmAvailabilitySession()

          return
        }

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Unable to load the fixture.',
          )
        }

        setMatch(
          data.match ||
            data,
        )

        const availabilityResponse =
          await fetch(
            `${API_URL}/teams/${teamId}/matches/${matchId}/availabilities/mine`,
            {
              headers: {
                Accept:
                  'application/json',

                Authorization:
                  token,
              },
            },
          )

        if (
          availabilityResponse.status ===
          401
        ) {
          await clearConfirmAvailabilitySession()

          return
        }

        if (
          availabilityResponse.ok
        ) {
          const availabilityData =
            await availabilityResponse.json()

          const existing =
            availabilityData.availability ||
            availabilityData

          setExistingAvailability(
            existing,
          )

          setSelectedStatus(
            existing.status,
          )
        } else if (
          availabilityResponse.status !==
          404
        ) {
          const errorData =
            await availabilityResponse.json()

          throw new Error(
            errorData.error ||
              'Unable to load your availability.',
          )
        }
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to connect to the server.',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchMatch()
  }, [
    matchId,
    navigate,
    teamId,
  ])

  // ========================================
  // SUBMIT AVAILABILITY
  // ========================================

  async function handleSubmit(
    event,
  ) {
    event.preventDefault()

    if (!selectedStatus) {
      setErrorMessage(
        'Please select available or unavailable.',
      )

      return
    }

    const token =
      getAuthToken()

    if (!token) {
      await clearConfirmAvailabilitySession()

      return
    }

    setSubmitting(true)
    setErrorMessage('')

    const updating =
      Boolean(
        existingAvailability,
      )

    const availabilityUrl =
      updating
        ? `${API_URL}/availabilities/${existingAvailability.id}`
        : `${API_URL}/teams/${teamId}/matches/${matchId}/availabilities`

    try {
      const response =
        await fetch(
          availabilityUrl,
          {
            method:
              updating
                ? 'PATCH'
                : 'POST',

            headers: {
              Accept:
                'application/json',

              'Content-Type':
                'application/json',

              Authorization:
                token,
            },

            body:
              JSON.stringify({
                availability: {
                  status:
                    selectedStatus,
                },
              }),
          },
        )

      if (
        response.status === 401
      ) {
        await clearConfirmAvailabilitySession()

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
          'Unable to submit your availability.'

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
        `/teams/${teamId}/matches/${matchId}`,
        {
          replace: true,

          state: {
            successMessage:
              updating
                ? 'Your availability has been updated.'
                : 'Your availability has been submitted.',
          },
        },
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to submit your availability.',
      )
    } finally {
      setSubmitting(false)
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

        <p className="dashboard-message">
          Loading fixture...
        </p>
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
      />

      <main className="edit-availability-page">
        <section className="edit-availability-container">
          <div className="edit-availability-heading">
            <p className="dashboard-label">
              Player availability
            </p>

            <h1>
              {existingAvailability
                ? 'Update availability'
                : 'Confirm availability'}
            </h1>

            <p>
              Let your manager know
              whether you can play.
            </p>
          </div>

          {errorMessage && (
            <p
              className="edit-availability-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {match && (
            <form
              className="edit-availability-card"
              onSubmit={
                handleSubmit
              }
            >
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

              <fieldset
                disabled={
                  submitting
                }
              >
                <legend>
                  Are you available?
                </legend>

                <label
                  className={`availability-option ${
                    selectedStatus ===
                    'available'
                      ? 'availability-option-selected'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="availability"
                    value="available"
                    checked={
                      selectedStatus ===
                      'available'
                    }
                    onChange={(
                      event,
                    ) =>
                      setSelectedStatus(
                        event.target
                          .value,
                      )
                    }
                  />

                  <span className="availability-option-icon">
                    ✓
                  </span>

                  <span>
                    <strong>
                      Available
                    </strong>

                    <small>
                      I can play in this
                      fixture.
                    </small>
                  </span>
                </label>

                <label
                  className={`availability-option ${
                    selectedStatus ===
                    'unavailable'
                      ? 'availability-option-selected'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="availability"
                    value="unavailable"
                    checked={
                      selectedStatus ===
                      'unavailable'
                    }
                    onChange={(
                      event,
                    ) =>
                      setSelectedStatus(
                        event.target
                          .value,
                      )
                    }
                  />

                  <span className="availability-option-icon">
                    ×
                  </span>

                  <span>
                    <strong>
                      Unavailable
                    </strong>

                    <small>
                      I cannot play in this
                      fixture.
                    </small>
                  </span>
                </label>
              </fieldset>

              <div className="edit-availability-actions">
                <Link
                  className="edit-availability-cancel"
                  to={`/teams/${teamId}/matches/${matchId}`}
                >
                  Cancel
                </Link>

                <button
                  className="edit-availability-submit"
                  type="submit"
                  disabled={
                    submitting ||
                    !selectedStatus
                  }
                >
                  {submitting
                    ? 'Saving...'
                    : existingAvailability
                      ? 'Update availability'
                      : 'Confirm availability'}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </>
  )
}

export default ConfirmAvailabilityPage
