import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

function CancelMatchPage() {
  const navigate = useNavigate()
  const { teamId, matchId } = useParams()

  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // ========================================
  // SESSION
  // ========================================

  async function clearCancelMatchSession() {
    await clearAuthToken()

    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')

    navigate('/login', {
      replace: true,
    })
  }

  // ========================================
  // LOAD MATCH
  // ========================================

  useEffect(() => {
    async function fetchMatch() {
      const token =
        getAuthToken()

      if (!token) {
        await clearCancelMatchSession()
        return
      }

      try {
        const response = await fetch(
          `${API_URL}/teams/${teamId}/matches/${matchId}`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: token,
            },
          },
        )

        if (response.status === 401) {
          await clearCancelMatchSession()
          return
        }

        const data =
          await response.json()

        if (!response.ok) {
          setErrorMessage(
            data.error ||
              'Unable to load the fixture.',
          )

          return
        }

        setMatch(data)
      } catch {
        setErrorMessage(
          'Unable to connect to the server.',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchMatch()
  }, [
    navigate,
    teamId,
    matchId,
  ])

  // ========================================
  // CANCEL MATCH
  // ========================================

  async function handleDelete() {
    const token =
      getAuthToken()

    if (!token) {
      await clearCancelMatchSession()
      return
    }

    setDeleting(true)
    setErrorMessage('')

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/matches/${matchId}`,
        {
          method: 'DELETE',

          headers: {
            Accept: 'application/json',
            Authorization: token,
          },
        },
      )

      if (response.status === 401) {
        await clearCancelMatchSession()
        return
      }

      if (!response.ok) {
        let message =
          'Unable to cancel the fixture.'

        try {
          const data =
            await response.json()

          message =
            data.error ||
            message
        } catch {
          // Rails may return an empty response.
        }

        setErrorMessage(message)
        return
      }

      navigate(
        `/teams/${teamId}/matches`,
        {
          replace: true,
        },
      )
    } catch {
      setErrorMessage(
        'Unable to connect to the server.',
      )
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading fixture...
      </p>
    )
  }

  return (
    <>
      <Navbar />

      <main className="dashboard-page">
        <section className="dashboard-content">
          <BackButton
            to={`/teams/${teamId}/matches/${matchId}`}
            label="Back to match"
          />

          <div className="dashboard-welcome">
            <p className="dashboard-label">
              Fixture management
            </p>

            <h1>
              Cancel fixture
            </h1>

            <p>
              Review the fixture before permanently cancelling it.
            </p>
          </div>

          {errorMessage && (
            <p className="team-error">
              {errorMessage}
            </p>
          )}

          {!errorMessage && match && (
            <article className="cancel-fixture-card">
              <div className="cancel-fixture-warning">
                <span aria-hidden="true">
                  ⚠️
                </span>

                <div>
                  <h2>
                    Are you sure?
                  </h2>

                  <p>
                    You are about to cancel the fixture against{' '}
                    <strong>
                      {match.opponent}
                    </strong>
                    . Approved players will receive a cancellation
                    notification.
                  </p>
                </div>
              </div>

              <div className="cancel-fixture-actions">
                <Link
                  className="keep-fixture-link"
                  to={`/teams/${teamId}/matches/${matchId}`}
                >
                  Keep fixture
                </Link>

                <button
                  className="confirm-cancel-button"
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting
                    ? 'Cancelling...'
                    : 'Yes, cancel fixture'}
                </button>
              </div>
            </article>
          )}
        </section>
      </main>
    </>
  )
}

export default CancelMatchPage
