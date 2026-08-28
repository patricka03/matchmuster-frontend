import '../styles/RemainingPages.mobile.css'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import './JoinPage.css'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

const POSITIONS = [
  {
    value: 'GK',
    label: 'Goalkeeper (GK)',
  },
  {
    value: 'CB',
    label: 'Centre-back (CB)',
  },
  {
    value: 'LB',
    label: 'Left-back (LB)',
  },
  {
    value: 'RB',
    label: 'Right-back (RB)',
  },
  {
    value: 'CDM',
    label:
      'Defensive midfielder (CDM)',
  },
  {
    value: 'CM',
    label:
      'Central midfielder (CM)',
  },
  {
    value: 'LW',
    label: 'Left winger (LW)',
  },
  {
    value: 'RW',
    label: 'Right winger (RW)',
  },
  {
    value: 'ST',
    label: 'Striker (ST)',
  },
]

function JoinPage() {
  const navigate = useNavigate()

  const [
    currentUser,
    setCurrentUser,
  ] = useState(null)

  const [
    inviteCode,
    setInviteCode,
  ] = useState('')

  const [
    preferredPosition,
    setPreferredPosition,
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
    successMessage,
    setSuccessMessage,
  ] = useState('')

  async function clearJoinSession() {
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

  useEffect(() => {
    async function fetchCurrentUser() {
      const token =
        getAuthToken()

      if (!token) {
        await clearJoinSession()
        return
      }

      try {
        const response =
          await fetch(
            `${API_URL}/users/me`,
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
          await clearJoinSession()
          return
        }

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Unable to load your account.',
          )
        }

        const user =
          data.user || data

        const isPlayer =
          user.account_type ===
          'player'

        const isApprovedManager =
          user.account_type ===
            'manager' &&
          user.manager_verification_status ===
            'approved'

        if (
          !isPlayer &&
          !isApprovedManager
        ) {
          navigate('/team', {
            replace: true,
          })

          return
        }

        setCurrentUser(user)
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to connect to the server.',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentUser()
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()

    const cleanedInviteCode =
      inviteCode.trim()

    if (!cleanedInviteCode) {
      setErrorMessage(
        'Please enter your team invite code.',
      )

      return
    }

    if (!preferredPosition) {
      setErrorMessage(
        'Please select your preferred position.',
      )

      return
    }

    const token =
      getAuthToken()

    if (!token) {
      await clearJoinSession()
      return
    }

    setSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response =
        await fetch(
          `${API_URL}/team_memberships/join`,
          {
            method: 'POST',

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
                team_membership: {
                  invite_code:
                    cleanedInviteCode,

                  preferred_position:
                    preferredPosition,
                },
              }),
          },
        )

      if (
        response.status === 401
      ) {
        await clearJoinSession()
        return
      }

      let data = {}

      try {
        data =
          await response.json()
      } catch {
        // Response may not contain JSON.
      }

      if (!response.ok) {
        let message =
          'Unable to join the team.'

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

        throw new Error(message)
      }

      // This is not sensitive authentication data,
      // so localStorage is fine here.
      localStorage.setItem(
        'teamJoinPending',
        'true',
      )

      setSuccessMessage(
        data.message ||
          'Your request has been sent to the team manager.',
      )

      setInviteCode('')
      setPreferredPosition('')
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to connect to the server.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading join team page...
      </p>
    )
  }

  return (
    <>
      <Navbar
        currentUser={currentUser}
      />

      <main className="dashboard-page mm-minimal-page">
        <section className="dashboard-content">
          <BackButton
            to="/dashboard"
            label="Back"
          />

          <div className="dashboard-welcome">
            <p className="dashboard-label">
              Team membership
            </p>

            <h1>
              Join a team
            </h1>

            <p>
              Enter the invite code
              provided by your team
              manager.
            </p>
          </div>

          {errorMessage && (
            <p
              className="team-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {successMessage ? (
            <article className="join-team-card">
              <div className="card-icon">
                ✓
              </div>

              <h2>
                Request sent
              </h2>

              <p
                className="join-team-success"
                role="status"
              >
                {successMessage}
              </p>

              <p>
                You’ll receive access
                after a manager approves
                your request.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/dashboard',
                  )
                }
              >
                Go to Home
              </button>
            </article>
          ) : (
            <form
              className="join-team-card join-team-form"
              onSubmit={handleSubmit}
            >
              <label htmlFor="invite-code">
                <span>
                  Team invite code
                </span>

                <input
                  id="invite-code"
                  name="inviteCode"
                  type="text"
                  value={inviteCode}
                  placeholder="For example: 1D57B0EA"
                  autoComplete="off"
                  autoCapitalize="characters"
                  disabled={submitting}
                  required
                  onChange={(event) =>
                    setInviteCode(
                      event.target.value.toUpperCase(),
                    )
                  }
                />
              </label>

              <label htmlFor="preferred-position">
                <span>
                  Preferred position
                </span>

                <select
                  id="preferred-position"
                  name="preferredPosition"
                  value={
                    preferredPosition
                  }
                  disabled={submitting}
                  required
                  onChange={(event) =>
                    setPreferredPosition(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Select your preferred
                    position
                  </option>

                  {POSITIONS.map(
                    (position) => (
                      <option
                        key={
                          position.value
                        }
                        value={
                          position.value
                        }
                      >
                        {position.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <p className="join-team-help">
                Your membership will
                remain pending until a
                manager approves it.
              </p>

              <button
                className="join-team-button"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? 'Sending request...'
                  : 'Request to join'}
              </button>
            </form>
          )}
        </section>
      </main>
    </>
  )
}

export default JoinPage
