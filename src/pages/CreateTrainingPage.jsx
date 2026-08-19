import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SearchBox } from '@mapbox/search-js-react'

import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

function CreateTrainingPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()

  const [formData, setFormData] = useState({
    title: '',
    starts_at: '',
    meet_time: '',
    location: '',
    latitude: null,
    longitude: null,
    description: '',
  })

  const [submitting, setSubmitting] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  // ========================================
  // SESSION
  // ========================================

  async function clearCreateTrainingSession() {
    await clearAuthToken()

    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')

    navigate('/login', {
      replace: true,
    })
  }

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

  function handleLocationChange(value) {
    setFormData(
      (currentFormData) => ({
        ...currentFormData,
        location: value,
        latitude: null,
        longitude: null,
      }),
    )
  }

  function handleLocationRetrieve(result) {
    const feature =
      result?.features?.[0]

    if (!feature) {
      return
    }

    const coordinates =
      feature.geometry?.coordinates

    if (
      !Array.isArray(coordinates) ||
      coordinates.length < 2
    ) {
      return
    }

    // GeoJSON stores coordinates as:
    // [longitude, latitude]
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
  // CREATE TRAINING
  // ========================================

  async function handleSubmit(event) {
    event.preventDefault()

    const token =
      getAuthToken()

    if (!token) {
      await clearCreateTrainingSession()
      return
    }

    if (
      formData.latitude === null ||
      formData.longitude === null
    ) {
      setErrorMessage(
        'Please select the training location from the location suggestions.',
      )

      return
    }

    setSubmitting(true)
    setErrorMessage('')

    try {
      const response =
        await fetch(
          `${API_URL}/teams/${teamId}/trainings`,
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
                training:
                  formData,
              }),
          },
        )

      const data =
        await response.json()

      if (
        response.status === 401
      ) {
        await clearCreateTrainingSession()
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

  // ========================================
  // RENDER
  // ========================================

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

            <h1>
              Create training
            </h1>

            <p>
              Add the details for your
              next team training
              session.
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
            {/* ========================================
                TITLE
            ======================================== */}

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
                placeholder="Tuesday Training"
                required
              />
            </div>

            {/* ========================================
                START TIME
            ======================================== */}

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

            {/* ========================================
                MEET TIME
            ======================================== */}

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

            {/* ========================================
                MAPBOX LOCATION
            ======================================== */}

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
                  placeholder="Search for a training ground, football centre, park or address"
                  options={{
                    country: 'GB',
                    language: 'en',
                    limit: 8,
                  }}
                  theme={{
                    icons: {
                      search: `
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          xmlns="http://www.w3.org/2000/svg"
                        ></svg>
                      `,
                    },
                  }}
                />
              ) : (
                <p
                  className="team-error"
                  role="alert"
                >
                  Mapbox is not
                  configured. Check
                  your frontend
                  environment
                  variables.
                </p>
              )}

              {formData.latitude !==
                null &&
                formData.longitude !==
                  null && (
                  <div className="selected-match-location">
                    <span>
                      📍 Location
                      selected
                    </span>

                    <strong>
                      {
                        formData.location
                      }
                    </strong>
                  </div>
                )}
            </div>

            {/* ========================================
                DESCRIPTION
            ======================================== */}

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
                placeholder="Bring boots, shin pads and blue training top."
                rows="5"
              />
            </div>

            {/* ========================================
                ACTIONS
            ======================================== */}

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
                disabled={
                  submitting
                }
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
