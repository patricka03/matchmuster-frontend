import { useEffect, useState } from 'react'
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'
import './EditAvailabilityPage.css'
import './EditAvailabilityPage.mobile.css'

function EditAvailabilityPage() {
  const navigate = useNavigate()
  const { teamId, matchId } = useParams()

  const [availability, setAvailability] = useState(null)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function fetchAvailability() {
      const token = localStorage.getItem('token')

      if (!token) {
        navigate('/login')
        return
      }

      try {
        const response = await fetch(
          `${API_URL}/teams/${teamId}/matches/${matchId}/availabilities/mine`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: token,
            },
          }
        )

        if (response.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('currentUser')
          navigate('/login')
          return
        }

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Unable to load your availability.'
          )
        }

        const availabilityData = data.availability || data

        setAvailability(availabilityData)
        setSelectedStatus(availabilityData.status)
      } catch (error) {
        setErrorMessage(
          error.message || 'Unable to connect to the server.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchAvailability()
  }, [matchId, navigate, teamId])

  async function handleSubmit(event) {
    event.preventDefault()

    if (!availability) {
      setErrorMessage('No availability response was found.')
      return
    }

    if (!selectedStatus) {
      setErrorMessage('Please select your availability.')
      return
    }

    const token = localStorage.getItem('token')

    if (!token) {
      navigate('/login')
      return
    }

    setSaving(true)
    setErrorMessage('')

    try {
      const response = await fetch(
        `${API_URL}/availabilities/${availability.id}`,
        {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: token,
          },
          body: JSON.stringify({
            availability: {
              status: selectedStatus,
            },
          }),
        }
      )

      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('currentUser')
        navigate('/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        let message = 'Unable to update your availability.'

        if (Array.isArray(data.errors)) {
          message = data.errors.join(', ')
        } else if (data.error) {
          message = data.error
        }

        throw new Error(message)
      }

      navigate(`/teams/${teamId}/matches/${matchId}`, {
        replace: true,
        state: {
          successMessage: 'Your availability has been updated.',
        },
      })
    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to update your availability.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar teamId={teamId} />

        <main className="edit-availability-page">
          <p className="edit-availability-message">
            Loading your availability...
          </p>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar teamId={teamId} />

      <main className="edit-availability-page">
        <section className="edit-availability-container">
          <BackButton
            to={`/teams/${teamId}/matches/${matchId}`}
            label="Back to match"
          />

          <div className="edit-availability-heading">
            <p className="dashboard-label">
              Player availability
            </p>

            <h1>Edit availability</h1>

            <p>
              Change whether you are available for this fixture.
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

          {availability && (
            <form
              className="edit-availability-card"
              onSubmit={handleSubmit}
            >
              <fieldset disabled={saving}>
                <legend>Are you available?</legend>

                <label
                  className={`availability-option ${
                    selectedStatus === 'available'
                      ? 'availability-option-selected'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="availability"
                    value="available"
                    checked={selectedStatus === 'available'}
                    onChange={(event) =>
                      setSelectedStatus(event.target.value)
                    }
                  />

                  <span className="availability-option-icon">
                    ✓
                  </span>

                  <span>
                    <strong>Available</strong>
                    <small>I can play in this fixture.</small>
                  </span>
                </label>

                <label
                  className={`availability-option ${
                    selectedStatus === 'unavailable'
                      ? 'availability-option-selected'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="availability"
                    value="unavailable"
                    checked={selectedStatus === 'unavailable'}
                    onChange={(event) =>
                      setSelectedStatus(event.target.value)
                    }
                  />

                  <span className="availability-option-icon">
                    ×
                  </span>

                  <span>
                    <strong>Unavailable</strong>
                    <small>I cannot play in this fixture.</small>
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
                    saving ||
                    !selectedStatus ||
                    selectedStatus === availability.status
                  }
                >
                  {saving
                    ? 'Saving...'
                    : 'Update availability'}
                </button>
              </div>
            </form>
          )}

          {!availability && (
            <Link
              className="edit-availability-back"
              to={`/teams/${teamId}/matches/${matchId}`}
            >
              Back to fixture
            </Link>
          )}
        </section>
      </main>
    </>
  )
}

export default EditAvailabilityPage
