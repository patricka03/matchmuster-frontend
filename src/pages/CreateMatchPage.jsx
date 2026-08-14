import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import API_URL from '../config/api'

function CreateMatchPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()

  const [formData, setFormData] = useState({
    opponent: '',
    match_type: 'league',
    location: '',
    kickoff_time: '',
    description: '',
  })

  const [errorMessages, setErrorMessages] = useState([])
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }))
  }

  function buildMatchPayload() {
    return {
      ...formData,

      // datetime-local gives us local browser time.
      // Convert it to an ISO timestamp containing
      // the correct UTC offset before sending to Rails.
      kickoff_time: new Date(
        formData.kickoff_time,
      ).toISOString(),
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const token = localStorage.getItem('token')

    if (!token) {
      navigate('/login')
      return
    }

    setSubmitting(true)
    setErrorMessages([])

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/matches`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
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

      const data = await response.json()

      if (!response.ok) {
        setErrorMessages(
          data.errors || [
            data.error ||
              'Unable to create the fixture.',
          ],
        )

        return
      }

      navigate(`/teams/${teamId}/matches`)
    } catch {
      setErrorMessages([
        'Unable to connect to the server.',
      ])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />

      <main className="dashboard-page">
        <section className="dashboard-content">
          <div className="dashboard-welcome">
            <p className="dashboard-label">
              Fixture management
            </p>

            <h1>Create fixture</h1>

            <p>
              Add the match details and notify your
              approved players.
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
                  {errorMessages.map((message) => (
                    <li key={message}>
                      {message}
                    </li>
                  ))}
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
                placeholder="e.g. Camden Athletic"
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
                placeholder="e.g. Hackney Marshes"
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
                to={`/teams/${teamId}/matches`}
              >
                Cancel
              </Link>

              <button
                className="create-match-button"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? 'Creating...'
                  : 'Create fixture'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  )
}

export default CreateMatchPage
