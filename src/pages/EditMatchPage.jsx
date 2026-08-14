import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'

function EditMatchPage() {
  const navigate = useNavigate()

  const {
    teamId,
    matchId,
  } = useParams()

  const [formData, setFormData] = useState({
    opponent: '',
    match_type: 'league',
    location: '',
    kickoff_time: '',
    description: '',
  })

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessages, setErrorMessages] = useState([])

  useEffect(() => {
    async function fetchMatch() {
      const token = localStorage.getItem('token')

      if (!token) {
        navigate('/login')
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
          localStorage.removeItem('token')
          localStorage.removeItem('currentUser')

          navigate('/login')
          return
        }

        const data = await response.json()

        if (!response.ok) {
          setErrorMessages([
            data.error ||
              'Unable to load the fixture.',
          ])

          return
        }

        setFormData({
          opponent: data.opponent || '',
          match_type: data.match_type || 'league',
          location: data.location || '',

          // API gives us the UTC timestamp.
          // Convert it back into the user's
          // local timezone for datetime-local.
          kickoff_time:
            formatForDateTimeInput(
              data.kickoff_time,
            ),

          description: data.description || '',
        })
      } catch {
        setErrorMessages([
          'Unable to connect to the server.',
        ])
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

  function formatForDateTimeInput(kickoffTime) {
    if (!kickoffTime) {
      return ''
    }

    const date = new Date(kickoffTime)

    const year =
      date.getFullYear()

    const month =
      String(
        date.getMonth() + 1,
      ).padStart(2, '0')

    const day =
      String(
        date.getDate(),
      ).padStart(2, '0')

    const hours =
      String(
        date.getHours(),
      ).padStart(2, '0')

    const minutes =
      String(
        date.getMinutes(),
      ).padStart(2, '0')

    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target

    setFormData(
      (currentFormData) => ({
        ...currentFormData,
        [name]: value,
      }),
    )
  }

  function buildMatchPayload() {
    return {
      ...formData,

      // Convert the local datetime-local value
      // into an absolute UTC ISO timestamp.
      kickoff_time: new Date(
        formData.kickoff_time,
      ).toISOString(),
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const token =
      localStorage.getItem('token')

    if (!token) {
      navigate('/login')
      return
    }

    setSubmitting(true)
    setErrorMessages([])

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/matches/${matchId}`,
        {
          method: 'PATCH',

          headers: {
            Accept: 'application/json',
            'Content-Type':
              'application/json',
            Authorization: token,
          },

          body: JSON.stringify({
            match: buildMatchPayload(),
          }),
        },
      )

      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('currentUser')

        navigate('/login')
        return
      }

      const data =
        await response.json()

      if (!response.ok) {
        setErrorMessages(
          data.errors || [
            data.error ||
              'Unable to update the fixture.',
          ],
        )

        return
      }

      navigate(
        `/teams/${teamId}/matches/${matchId}`,
      )
    } catch {
      setErrorMessages([
        'Unable to connect to the server.',
      ])
    } finally {
      setSubmitting(false)
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

            <h1>Edit fixture</h1>

            <p>
              Update the fixture details. Players
              will be notified about important
              changes.
            </p>
          </div>

          <form
            className="match-form"
            onSubmit={handleSubmit}
          >
            {errorMessages.length > 0 && (
              <div className="team-error">
                <strong>
                  Please check the following:
                </strong>

                <ul>
                  {errorMessages.map(
                    (message) => (
                      <li key={message}>
                        {message}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="opponent">
                Opponent
              </label>

              <input
                id="opponent"
                name="opponent"
                type="text"
                value={formData.opponent}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="match_type">
                Match type
              </label>

              <select
                id="match_type"
                name="match_type"
                value={formData.match_type}
                onChange={handleChange}
                required
              >
                <option value="league">
                  League
                </option>

                <option value="cup">
                  Cup
                </option>

                <option value="friendly">
                  Friendly
                </option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="location">
                Location
              </label>

              <input
                id="location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="kickoff_time">
                Kick-off date and time
              </label>

              <input
                id="kickoff_time"
                name="kickoff_time"
                type="datetime-local"
                value={formData.kickoff_time}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">
                Match information
              </label>

              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g. Wear the blue kit and bring shin pads and boots."
                rows={5}
              />
            </div>

            <div className="match-form-actions">
              <Link
                className="cancel-match-link"
                to={`/teams/${teamId}/matches/${matchId}`}
              >
                Cancel
              </Link>

              <button
                className="create-match-button"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? 'Saving...'
                  : 'Save changes'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  )
}

export default EditMatchPage
