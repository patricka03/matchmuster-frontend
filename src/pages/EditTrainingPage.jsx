import { useEffect, useState } from 'react'
import {
  useNavigate,
  useParams,
} from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'

function EditTrainingPage() {
  const navigate = useNavigate()

  const {
    teamId,
    trainingId,
  } = useParams()

  const [formData, setFormData] =
    useState({
      title: '',
      starts_at: '',
      meet_time: '',
      location: '',
      description: '',
    })

  const [loading, setLoading] =
    useState(true)

  const [submitting, setSubmitting] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  useEffect(() => {
    async function loadTraining() {
      const token =
        localStorage.getItem('token')

      if (!token) {
        navigate('/login', {
          replace: true,
        })

        return
      }

      try {
        const response = await fetch(
          `${API_URL}/teams/${teamId}/trainings/${trainingId}`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: token,
            },
          },
        )

        const data =
          await response.json()

        if (response.status === 401) {
          localStorage.removeItem(
            'token',
          )

          localStorage.removeItem(
            'currentUser',
          )

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
            data.error ||
              'Unable to load training.',
          )
        }

        setFormData({
          title:
            data.title || '',

          starts_at:
            formatForInput(
              data.starts_at,
            ),

          meet_time:
            formatForInput(
              data.meet_time,
            ),

          location:
            data.location || '',

          description:
            data.description || '',
        })
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to load training.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadTraining()
  }, [
    navigate,
    teamId,
    trainingId,
  ])

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

  async function handleSubmit(
    event,
  ) {
    event.preventDefault()

    const token =
      localStorage.getItem('token')

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
        `${API_URL}/teams/${teamId}/trainings/${trainingId}`,
        {
          method: 'PATCH',

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
              training:
                formData,
            }),
        },
      )

      const data =
        await response.json()

      if (response.status === 401) {
        localStorage.removeItem(
          'token',
        )

        localStorage.removeItem(
          'currentUser',
        )

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
            'Unable to update training.',
        )
      }

      navigate(
        `/teams/${teamId}/trainings/${trainingId}`,
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to update training.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading training...
      </p>
    )
  }

  return (
    <>
      <Navbar teamId={teamId} />

      <main className="dashboard-page">
        <section className="dashboard-content">
          <BackButton
            to={`/teams/${teamId}/trainings/${trainingId}`}
            label="Back to training"
          />

          <div className="dashboard-welcome">
            <p className="dashboard-label">
              Training
            </p>

            <h1>
              Edit training
            </h1>

            <p>
              Update your training
              session details.
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
            onSubmit={
              handleSubmit
            }
          >
            <div className="form-group">
              <label htmlFor="training-title">
                Title
              </label>

              <input
                id="training-title"
                name="title"
                type="text"
                value={
                  formData.title
                }
                onChange={
                  handleChange
                }
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
                value={
                  formData.starts_at
                }
                onChange={
                  handleChange
                }
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
                value={
                  formData.meet_time
                }
                onChange={
                  handleChange
                }
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
                value={
                  formData.location
                }
                onChange={
                  handleChange
                }
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
                value={
                  formData.description
                }
                onChange={
                  handleChange
                }
                rows="5"
              />
            </div>

            <div className="match-form-actions">
              <button
                type="button"
                className="cancel-match-link"
                onClick={() =>
                  navigate(
                    `/teams/${teamId}/trainings/${trainingId}`,
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="create-match-button"
                disabled={
                  submitting
                }
              >
                {submitting
                  ? 'Saving...'
                  : 'Save training'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  )
}

function formatForInput(
  dateTime,
) {
  if (!dateTime) {
    return ''
  }

  const date =
    new Date(dateTime)

  const offset =
    date.getTimezoneOffset()

  const localDate =
    new Date(
      date.getTime() -
        offset * 60 * 1000,
    )

  return localDate
    .toISOString()
    .slice(0, 16)
}

export default EditTrainingPage
