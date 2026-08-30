import '../styles/RemainingPages.mobile.css'
import { useState } from 'react'
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

function CreateMatchPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()

  const [formData, setFormData] = useState({
    opponent: '',
    match_type: 'league',
    location: '',
    latitude: null,
    longitude: null,
    kickoff_time: '',
    description: '',
  })

  const [errorMessages, setErrorMessages] = useState([])
  const [submitting, setSubmitting] = useState(false)

  // ========================================
  // SESSION
  // ========================================

  async function clearCreateMatchSession() {
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
    const { name, value } = event.target

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }))
  }

  // ========================================
  // MAPBOX LOCATION SEARCH
  // ========================================

  function handleLocationChange(value) {
    setFormData((currentFormData) => ({
      ...currentFormData,

      location: value,

      // If the manager edits the text after selecting
      // a Mapbox result, require them to select a new
      // suggestion so stale coordinates are not saved.
      latitude: null,
      longitude: null,
    }))
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

    // GeoJSON coordinates are:
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

    setFormData((currentFormData) => ({
      ...currentFormData,

      location:
        locationName ||
        currentFormData.location,

      latitude,
      longitude,
    }))

    setErrorMessages([])
  }

  function handleLocationClear() {
    setFormData((currentFormData) => ({
      ...currentFormData,

      location: '',
      latitude: null,
      longitude: null,
    }))
  }

  // ========================================
  // SUBMIT
  // ========================================

  // ========================================
  // DATE / TIME PAYLOAD
  // ========================================

  function buildMatchPayload() {
    const localKickoff =
      new Date(
        formData.kickoff_time,
      )

    return {
      ...formData,

      /*
       * datetime-local contains the manager's device-local
       * time with no timezone. Convert it at the browser
       * boundary so Rails receives an unambiguous UTC ISO
       * timestamp. This follows BST/GMT automatically.
       */
      kickoff_time:
        Number.isNaN(
          localKickoff.getTime(),
        )
          ? formData.kickoff_time
          : localKickoff.toISOString(),
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const token =
      getAuthToken()

    if (!token) {
      await clearCreateMatchSession()
      return
    }

    // Require the manager to choose a Mapbox result.
    // This guarantees that navigation coordinates exist.
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
        await clearCreateMatchSession()
        return
      }

      const data =
        await response.json()

      if (!response.ok) {
        setErrorMessages(
          data.errors || [
            data.error ||
              'Unable to create the fixture.',
          ],
        )

        return
      }

      navigate(
        `/teams/${teamId}/schedule`,
      )
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

      <main className="dashboard-page mm-minimal-page">
        <section className="dashboard-content">
          <div className="dashboard-welcome">
            <p className="dashboard-label">
              Fixture management
            </p>

            <h1 className="mm-page-title">
              Create fixture
            </h1>

            <p>
              Add the match details and
              notify your approved players.
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
                placeholder=""
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
              <label>
                Match location
              </label>

              {MAPBOX_TOKEN ? (
                <SearchBox
                  accessToken={MAPBOX_TOKEN}
                  value={formData.location}
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
                value={formData.kickoff_time}
                onChange={handleChange}
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
                value={formData.description}
                onChange={handleChange}
                placeholder=""
                rows={5}
              />
            </div>

            <div className="match-form-actions">
              <Link
                className="cancel-match-link"
                to={`/teams/${teamId}/schedule`}
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
