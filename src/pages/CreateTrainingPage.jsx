import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'

function CreateTrainingPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()

  const [formData, setFormData] = useState({
    title: '',
    starts_at: '',
    meet_time: '',
    location: '',
    description: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const token = localStorage.getItem('token')

    if (!token) {
      navigate('/login', {
        replace: true,
      })

      return
    }

    setSubmitting(true)
    setErrorMessage('')

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/trainings`,
        {
          method: 'POST',

          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: token,
          },

          body: JSON.stringify({
            training: formData,
          }),
        },
      )

      const data = await response.json()

      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('currentUser')

        navigate('/login', {
          replace: true,
        })

        return
      }

      if (response.status === 403) {
        navigate('/dashboard', {
          replace: true,
        })

        return
      }

      if (!response.ok) {
        throw new Error(
          data.errors?.join(', ') ||
            data.error ||
            'Unable to create training.',
        )
      }

      navigate(
        `/teams/${teamId}/trainings/${data.id}`,
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to create training.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Navbar teamId={teamId} />

      <main className="dashboard-page">
        <section className="dashboard-content">
          <BackButton
            to={`/teams/${teamId}/trainings`}
            label="Back to training"
          />

          <div className="dashboard-welcome">
            <p className="dashboard-label">
              Training
            </p>

            <h1>Create training</h1>

            <p>
              Add the details for your next
              team training session.
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

          <form
            className="match-form"
            onSubmit={handleSubmit}
          >
            <div className="form-group">
              <label htmlFor="training-title">
                Title
              </label>

              <input
                id="training-title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="Tuesday Training"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="training-starts">
                Starts
              </label>

              <input
                id="training-starts"
                name="starts_at"
                type="datetime-local"
                value={formData.starts_at}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="training-meet-time">
                Meet time
              </label>

              <input
                id="training-meet-time"
                name="meet_time"
                type="datetime-local"
                value={formData.meet_time}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="training-location">
                Location
              </label>

              <input
                id="training-location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                placeholder="Goals Soccer Centre"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="training-description">
                Description
              </label>

              <textarea
                id="training-description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Bring boots, shin pads and blue training top."
                rows="5"
              />
            </div>

            <div className="match-form-actions">
              <button
                type="button"
                className="cancel-match-link"
                onClick={() =>
                  navigate(
                    `/teams/${teamId}/trainings`,
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="create-match-button"
                disabled={submitting}
              >
                {submitting
                  ? 'Creating...'
                  : 'Create training'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  )
}

export default CreateTrainingPage
