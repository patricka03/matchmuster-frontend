import '../styles/RemainingPages.mobile.css'
import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import { SearchBox } from '@mapbox/search-js-react'

import Navbar from '../components/Navbar'
import API_URL from '../config/api'

import { MATCHMUSTER_SEARCH_THEME } from '../utils/mapboxSearchTheme'
import { localDateTimeToIso } from '../utils/dateTime'
import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

function EditTrainingPage() {
  const navigate = useNavigate()

  const {
    teamId,
    trainingId,
  } = useParams()

  const [
    formData,
    setFormData,
  ] = useState({
    title: '',
    starts_at: '',
    meet_time: '',
    location: '',
    latitude: null,
    longitude: null,
    description: '',
  })

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  // ========================================
  // SESSION
  // ========================================

  async function clearEditTrainingSession() {
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
  // LOAD TRAINING
  // ========================================

  useEffect(() => {
    async function loadTraining() {
      const token =
        getAuthToken()

      if (!token) {
        await clearEditTrainingSession()
        return
      }

      try {
        const response =
          await fetch(
            `${API_URL}/teams/${teamId}/trainings/${trainingId}`,
            {
              headers: {
                Accept:
                  'application/json',

                Authorization:
                  token,
              },
            },
          )

        const data =
          await response.json()

        if (
          response.status === 401
        ) {
          await clearEditTrainingSession()
          return
        }

        if (
          response.status === 403
        ) {
          navigate(
            '/dashboard',
            {
              replace: true,
            },
          )

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

            latitude:
              data.latitude ??
              null,

            longitude:
              data.longitude ??
              null,

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

  // ========================================
  // FORM
  // ========================================

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

  // ========================================
  // MAPBOX LOCATION
  // ========================================

  function handleLocationChange(
    value,
  ) {
    setFormData(
      (currentFormData) => ({
        ...currentFormData,

        location: value,
        latitude: null,
        longitude: null,
      }),
    )
  }

  function handleLocationRetrieve(
    result,
  ) {
    const feature =
      result?.features?.[0]

    if (!feature) {
      return
    }

    const coordinates =
      feature.geometry
        ?.coordinates

    if (
      !Array.isArray(
        coordinates,
      ) ||
      coordinates.length < 2
    ) {
      return
    }

    const [
      longitude,
      latitude,
    ] = coordinates

    const properties =
      feature.properties || {}

    const locationName =
      properties.full_address ||
      [
        properties.name,
        properties.place_formatted,
      ]
        .filter(Boolean)
        .join(', ')

    setFormData(
      (currentFormData) => ({
        ...currentFormData,

        location:
          locationName ||
          currentFormData.location,

        latitude,
        longitude,
      }),
    )

    setErrorMessage('')
  }

  function handleLocationClear() {
    setFormData(
      (currentFormData) => ({
        ...currentFormData,

        location: '',
        latitude: null,
        longitude: null,
      }),
    )
  }

  // ========================================
  // UPDATE TRAINING
  // ========================================

  // ========================================
  // DATE / TIME PAYLOAD
  // ========================================

  function buildTrainingPayload() {
    return {
      ...formData,

      starts_at:
        localDateTimeToIso(
          formData.starts_at,
        ),

      meet_time:
        localDateTimeToIso(
          formData.meet_time,
        ),
    }
  }

  async function handleSubmit(
    event,
  ) {
    event.preventDefault()

    const token =
      getAuthToken()

    if (!token) {
      await clearEditTrainingSession()
      return
    }

    setSubmitting(true)
    setErrorMessage('')

    try {
      const response =
        await fetch(
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
                  buildTrainingPayload(),
              }),
          },
        )

      const data =
        await response.json()

      if (
        response.status === 401
      ) {
        await clearEditTrainingSession()
        return
      }

      if (
        response.status === 403
      ) {
        navigate(
          '/dashboard',
          {
            replace: true,
          },
        )

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

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading training...
      </p>
    )
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      <Navbar teamId={teamId} />

      <main className="dashboard-page mm-minimal-page">
        <section className="dashboard-content">
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
              <label>
                Location
              </label>

              {MAPBOX_TOKEN ? (
                <SearchBox
                  accessToken={
                    MAPBOX_TOKEN
                  }
                  value={
                    formData.location
                  }
                  onChange={
                    handleLocationChange
                  }
                  onRetrieve={
                    handleLocationRetrieve
                  }
                  onClear={
                    handleLocationClear
                  }
                  placeholder=""
                  options={{
                    country: 'GB',
                    language: 'en',
                    limit: 8,
                  }}
                  theme={
                    MATCHMUSTER_SEARCH_THEME
                  }
                />
              ) : (
                <p
                  className="team-error"
                  role="alert"
                >
                  Location search is
                  unavailable.
                </p>
              )}

              {formData.latitude !==
                null &&
                formData.longitude !==
                  null && (
                  <div className="selected-match-location">
                    <span>
                      Location selected
                    </span>

                    <strong>
                      {
                        formData.location
                      }
                    </strong>
                  </div>
                )}
            </div>

            <div className="form-group">
              <label htmlFor="training-description">
                Notes
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
