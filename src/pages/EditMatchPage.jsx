import '../styles/RemainingPages.mobile.css'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SearchBox } from '@mapbox/search-js-react'

import Navbar from '../components/Navbar'
import API_URL from '../config/api'

import { MATCHMUSTER_SEARCH_THEME } from '../utils/mapboxSearchTheme'
import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

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
    latitude: null,
    longitude: null,
    kickoff_time: '',
    description: '',
  })

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessages, setErrorMessages] = useState([])

  // ========================================
  // SESSION
  // ========================================

  async function clearEditMatchSession() {
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
        await clearEditMatchSession()
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
          await clearEditMatchSession()
          return
        }

        const data =
          await response.json()

        if (!response.ok) {
          setErrorMessages([
            data.error ||
              'Unable to load the fixture.',
          ])

          return
        }

        setFormData({
          opponent:
            data.opponent || '',

          match_type:
            data.match_type || 'league',

          location:
            data.location || '',

          latitude:
            data.latitude !== null &&
            data.latitude !== undefined
              ? Number(data.latitude)
              : null,

          longitude:
            data.longitude !== null &&
            data.longitude !== undefined
              ? Number(data.longitude)
              : null,

          kickoff_time:
            formatForDateTimeInput(
              data.kickoff_time,
            ),

          description:
            data.description || '',
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

  // ========================================
  // DATE / TIME
  // ========================================

  function formatForDateTimeInput(
    kickoffTime,
  ) {
    if (!kickoffTime) {
      return ''
    }

    const date =
      new Date(kickoffTime)

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

  // ========================================
  // STANDARD FORM FIELDS
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

    setErrorMessages([])
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
  // PAYLOAD
  // ========================================

  function buildMatchPayload() {
    return {
      ...formData,

      kickoff_time:
        new Date(
          formData.kickoff_time,
        ).toISOString(),
    }
  }

  // ========================================
  // SUBMIT
  // ========================================

  async function handleSubmit(event) {
    event.preventDefault()

    const token =
      getAuthToken()

    if (!token) {
      await clearEditMatchSession()
      return
    }

    if (
      formData.latitude === null ||
      formData.longitude === null
    ) {
      setErrorMessages([
        'Please select the match location from the location suggestions.',
      ])

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
            match:
              buildMatchPayload(),
          }),
        },
      )

      if (response.status === 401) {
        await clearEditMatchSession()
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

      <main className="dashboard-page mm-minimal-page">
        <section className="dashboard-content">
          <div className="dashboard-welcome">
            <p className="dashboard-label">
              Fixture management
            </p>

            <h1>
              Edit fixture
            </h1>

            <p>
              Update the fixture details.
              Players will be notified about
              important changes.
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
                value={
                  formData.opponent
                }
                onChange={
                  handleChange
                }
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
                value={
                  formData.match_type
                }
                onChange={
                  handleChange
                }
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
              <label>
                Match location
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
                  theme={MATCHMUSTER_SEARCH_THEME}
                />
              ) : (
                <p
                  className="team-error"
                  role="alert"
                >
                  Mapbox is not configured.
                  Check your frontend
                  environment variables.
                </p>
              )}

              {formData.latitude !== null &&
                formData.longitude !== null && (
                  <div className="selected-match-location">
                    <span>
                      📍 Location selected
                    </span>

                    <strong>
                      {formData.location}
                    </strong>
                  </div>
                )}
            </div>

            <div className="form-group">
              <label htmlFor="kickoff_time">
                Kick-off date and time
              </label>

              <input
                id="kickoff_time"
                name="kickoff_time"
                type="datetime-local"
                value={
                  formData.kickoff_time
                }
                onChange={
                  handleChange
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">
                Notes
              </label>

              <textarea
                id="description"
                name="description"
                value={
                  formData.description
                }
                onChange={
                  handleChange
                }
                placeholder=""
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
                disabled={
                  submitting
                }
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
