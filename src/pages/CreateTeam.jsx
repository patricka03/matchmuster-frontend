import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import './CreateTeam.css'
import './CreateTeam.mobile.css'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

function CreatTeam() {
  const navigate = useNavigate()
  const badgeInputRef = useRef(null)

  const [currentUser, setCurrentUser] = useState(null)
  const [teamName, setTeamName] = useState('')
  const [description, setDescription] = useState('')
  const [badgeFile, setBadgeFile] = useState(null)

  const [badgePreviewUrl, setBadgePreviewUrl] =
    useState('')

  const [createdTeamId, setCreatedTeamId] =
    useState(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function clearCreateTeamSession() {
    await clearAuthToken()

    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')

    navigate('/login', {
      replace: true,
    })
  }

  useEffect(() => {
    async function fetchCurrentUser() {
      const token = getAuthToken()

      if (!token) {
        await clearCreateTeamSession()
        return
      }

      try {
        const headers = {
          Accept: 'application/json',
          Authorization: token,
        }

        const [
          response,
          teamsResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/users/me`,
            { headers },
          ),
          fetch(
            `${API_URL}/teams`,
            { headers },
          ),
        ])

        if (
          response.status === 401 ||
          teamsResponse.status === 401
        ) {
          await clearCreateTeamSession()
          return
        }

        const data = await response.json()

        const teamsData =
          await teamsResponse.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Unable to load your account.',
          )
        }

        if (!teamsResponse.ok) {
          throw new Error(
            teamsData.error ||
              'Unable to check your team plan.',
          )
        }

        const user = data.user || data

        const isApprovedManager =
          user.account_type === 'manager' &&
          user.manager_verification_status ===
            'approved'

        if (!isApprovedManager) {
          navigate('/team', {
            replace: true,
          })

          return
        }

        const loadedTeams =
          Array.isArray(teamsData)
            ? teamsData
            : teamsData.teams || []

        const creationAccess =
          loadedTeams
            .map(
              (team) =>
                team.multi_team_access,
            )
            .find(
              (access) =>
                access
                  ?.owned_by_current_manager ===
                true,
            ) ||
          loadedTeams
            .map(
              (team) =>
                team.multi_team_access,
            )
            .find(Boolean)

        if (
          creationAccess
            ?.can_create_additional_team ===
          false
        ) {
          navigate(
            '/team?plus=required',
            {
              replace: true,
            },
          )

          return
        }

        setCurrentUser(user)
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to connect to the server.',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentUser()
  }, [navigate])

  useEffect(() => {
    return () => {
      if (badgePreviewUrl) {
        URL.revokeObjectURL(
          badgePreviewUrl,
        )
      }
    }
  }, [badgePreviewUrl])

  function clearBadgeSelection() {
    if (badgePreviewUrl) {
      URL.revokeObjectURL(
        badgePreviewUrl,
      )
    }

    setBadgeFile(null)
    setBadgePreviewUrl('')

    if (badgeInputRef.current) {
      badgeInputRef.current.value = ''
    }
  }

  function handleBadgeSelection(event) {
    const selectedFile =
      event.target.files?.[0]

    setErrorMessage('')

    if (!selectedFile) {
      clearBadgeSelection()
      return
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (
      !allowedTypes.includes(
        selectedFile.type,
      )
    ) {
      clearBadgeSelection()

      setErrorMessage(
        'Please select a JPG, PNG or WebP image.',
      )

      return
    }

    if (
      selectedFile.size >
      5 * 1024 * 1024
    ) {
      clearBadgeSelection()

      setErrorMessage(
        'The team badge must be smaller than 5 MB.',
      )

      return
    }

    if (badgePreviewUrl) {
      URL.revokeObjectURL(
        badgePreviewUrl,
      )
    }

    setBadgeFile(selectedFile)

    setBadgePreviewUrl(
      URL.createObjectURL(
        selectedFile,
      ),
    )
  }

  async function uploadBadge(
    teamId,
    token,
  ) {
    const formData = new FormData()

    formData.append(
      'badge',
      badgeFile,
    )

    const response = await fetch(
      `${API_URL}/teams/${teamId}/badge`,
      {
        method: 'PATCH',

        headers: {
          Accept: 'application/json',
          Authorization: token,
        },

        body: formData,
      },
    )

    const data =
      await response
        .json()
        .catch(() => ({}))

    if (response.status === 401) {
      await clearCreateTeamSession()
      return false
    }

    if (!response.ok) {
      const errors =
        Array.isArray(data.errors)
          ? data.errors.join(', ')
          : ''

      throw new Error(
        data.error ||
          errors ||
          'Your team was created, but its badge could not be uploaded. Please try the badge upload again.',
      )
    }

    return true
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const cleanedTeamName =
      teamName.trim()

    const cleanedDescription =
      description.trim()

    if (!cleanedTeamName) {
      setErrorMessage(
        'Please enter a team name.',
      )

      return
    }

    const token = getAuthToken()

    if (!token) {
      await clearCreateTeamSession()
      return
    }

    setSubmitting(true)
    setErrorMessage('')

    try {
      let teamId = createdTeamId

      if (!teamId) {
        const response = await fetch(
          `${API_URL}/teams`,
          {
            method: 'POST',

            headers: {
              Accept: 'application/json',
              'Content-Type':
                'application/json',
              Authorization: token,
            },

            body: JSON.stringify({
              team: {
                name: cleanedTeamName,
                description:
                  cleanedDescription,
              },
            }),
          },
        )

        if (response.status === 401) {
          await clearCreateTeamSession()
          return
        }

        const data =
          await response
            .json()
            .catch(() => ({}))

        if (!response.ok) {
          if (
            data.code ===
            'multi_team_plus_required'
          ) {
            navigate(
              '/team?plus=required',
              {
                replace: true,
              },
            )

            return
          }

          let message =
            'Unable to create the team.'

          if (
            Array.isArray(
              data.errors,
            )
          ) {
            message =
              data.errors.join(', ')
          } else if (data.error) {
            message = data.error
          }

          throw new Error(message)
        }

        const createdTeam =
          data.team || data

        teamId = createdTeam.id

        if (
          badgeFile &&
          !teamId
        ) {
          throw new Error(
            'Your team was created, but its badge could not be uploaded. Open Edit Team to add it.',
          )
        }

        setCreatedTeamId(teamId)
      }

      if (badgeFile) {
        const uploaded =
          await uploadBadge(
            teamId,
            token,
          )

        if (!uploaded) return
      }

      navigate('/team', {
        replace: true,
      })
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to connect to the server.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading create team page...
      </p>
    )
  }

  return (
    <>
      <Navbar
        currentUser={currentUser}
      />

      <main className="dashboard-page">
        <section className="dashboard-content">
          <BackButton
            to="/team"
            label="Back to My Team"
          />

          <div className="dashboard-welcome">
            <p className="dashboard-label">
              Team management
            </p>

            <h1>
              Create a team
            </h1>

            <p>
              Set up your football team
              and generate an invite code
              for your squad.
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
            className="create-team-card create-team-form"
            onSubmit={handleSubmit}
          >
            <label htmlFor="team-name">
              <span>
                Team name
              </span>

              <input
                id="team-name"
                name="teamName"
                type="text"
                value={teamName}
                placeholder="For example: East London FC"
                autoComplete="off"
                maxLength={100}
                disabled={submitting}
                required
                onChange={(event) =>
                  setTeamName(
                    event.target.value,
                  )
                }
              />
            </label>

            <label htmlFor="team-description">
              <span>
                Team description
              </span>

              <textarea
                id="team-description"
                name="description"
                value={description}
                placeholder="Tell players something about your team..."
                rows={5}
                maxLength={500}
                disabled={submitting}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
              />
            </label>

            <div className="create-team-badge-field">
              <label htmlFor="team-badge">
                <span>
                  Team badge (optional)
                </span>
              </label>

              <div className="create-team-badge-row">
                <div className="create-team-badge-preview">
                  {badgePreviewUrl ? (
                    <img
                      src={badgePreviewUrl}
                      alt="Selected team badge preview"
                    />
                  ) : (
                    <span aria-hidden="true">
                      ⚽
                    </span>
                  )}
                </div>

                <div className="create-team-badge-controls">
                  <input
                    ref={badgeInputRef}
                    id="team-badge"
                    name="badge"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={submitting}
                    aria-describedby="team-badge-help"
                    onChange={
                      handleBadgeSelection
                    }
                  />

                  <small id="team-badge-help">
                    JPG, PNG or WebP.
                    Maximum size 5 MB.
                  </small>

                  {badgeFile && (
                    <button
                      className="remove-team-badge-button"
                      type="button"
                      disabled={submitting}
                      onClick={
                        clearBadgeSelection
                      }
                    >
                      Remove selected image
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="create-team-help">
              An invite code will be
              generated after your team
              has been created.
            </p>

            <button
              className="create-team-button"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? createdTeamId
                  ? 'Uploading badge...'
                  : badgeFile
                    ? 'Creating team and uploading badge...'
                    : 'Creating team...'
                : createdTeamId
                  ? 'Retry badge upload'
                  : 'Create team'}
            </button>

            {createdTeamId && (
              <button
                className="skip-team-badge-button"
                type="button"
                disabled={submitting}
                onClick={() =>
                  navigate('/team', {
                    replace: true,
                  })
                }
              >
                Skip badge for now
              </button>
            )}
          </form>
        </section>
      </main>
    </>
  )
}

export default CreatTeam
