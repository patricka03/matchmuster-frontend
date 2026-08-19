import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import API_URL from '../config/api'

function EditTeamPage() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const badgeInputRef = useRef(null)

  const [currentUser, setCurrentUser] = useState(null)
  const [teamName, setTeamName] = useState('')
  const [description, setDescription] = useState('')

  const [badgeUrl, setBadgeUrl] = useState('')
  const [badgeFile, setBadgeFile] = useState(null)
  const [badgePreviewUrl, setBadgePreviewUrl] =
    useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingBadge, setUploadingBadge] =
    useState(false)

  const [errorMessage, setErrorMessage] = useState('')
  const [badgeErrorMessage, setBadgeErrorMessage] =
    useState('')
  const [badgeSuccessMessage, setBadgeSuccessMessage] =
    useState('')

  useEffect(() => {
    async function fetchEditTeamPage() {
      const token = localStorage.getItem('token')

      if (!token) {
        navigate('/login', { replace: true })
        return
      }

      const headers = {
        Accept: 'application/json',
        Authorization: token,
      }

      try {
        const [teamResponse, userResponse] =
          await Promise.all([
            fetch(`${API_URL}/teams/${teamId}`, {
              headers,
            }),
            fetch(`${API_URL}/users/me`, {
              headers,
            }),
          ])

        if (
          teamResponse.status === 401 ||
          userResponse.status === 401
        ) {
          localStorage.removeItem('token')
          localStorage.removeItem('currentUser')
          navigate('/login', { replace: true })
          return
        }

        const teamData = await teamResponse.json()
        const userData = await userResponse.json()

        if (!teamResponse.ok) {
          throw new Error(
            teamData.error || 'Unable to load this team.'
          )
        }

        if (!userResponse.ok) {
          throw new Error(
            userData.error ||
              'Unable to load your account.'
          )
        }

        const loadedTeam = teamData.team || teamData
        const loadedUser = userData.user || userData

        const isApprovedManager =
          loadedUser.account_type === 'manager' &&
          loadedUser.manager_verification_status ===
            'approved'

        const managesThisTeam =
          loadedTeam.membership_role === 'manager'

        if (!isApprovedManager || !managesThisTeam) {
          navigate('/team', { replace: true })
          return
        }

        setCurrentUser(loadedUser)
        setTeamName(loadedTeam.name || '')
        setDescription(loadedTeam.description || '')
        setBadgeUrl(loadedTeam.badge_url || '')
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to connect to the server.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchEditTeamPage()
  }, [navigate, teamId])

  useEffect(() => {
    return () => {
      if (badgePreviewUrl) {
        URL.revokeObjectURL(badgePreviewUrl)
      }
    }
  }, [badgePreviewUrl])

  function clearBadgeSelection() {
    if (badgePreviewUrl) {
      URL.revokeObjectURL(badgePreviewUrl)
    }

    setBadgeFile(null)
    setBadgePreviewUrl('')

    if (badgeInputRef.current) {
      badgeInputRef.current.value = ''
    }
  }

  function handleBadgeSelection(event) {
    const selectedFile = event.target.files?.[0]

    setBadgeErrorMessage('')
    setBadgeSuccessMessage('')

    if (!selectedFile) {
      return
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(selectedFile.type)) {
      clearBadgeSelection()
      setBadgeErrorMessage(
        'Please select a JPG, PNG or WebP image.'
      )
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      clearBadgeSelection()
      setBadgeErrorMessage(
        'The team badge must be smaller than 5 MB.'
      )
      return
    }

    if (badgePreviewUrl) {
      URL.revokeObjectURL(badgePreviewUrl)
    }

    setBadgeFile(selectedFile)
    setBadgePreviewUrl(
      URL.createObjectURL(selectedFile)
    )
  }

  async function handleBadgeUpload(event) {
    event.preventDefault()

    if (!badgeFile) {
      setBadgeErrorMessage(
        'Please select a team badge first.'
      )
      return
    }

    const token = localStorage.getItem('token')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    const formData = new FormData()
    formData.append('badge', badgeFile)

    setUploadingBadge(true)
    setBadgeErrorMessage('')
    setBadgeSuccessMessage('')

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/badge`,
        {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            Authorization: token,
          },
          body: formData,
        }
      )

      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('currentUser')
        navigate('/login', { replace: true })
        return
      }

      if (response.status === 403) {
        throw new Error(
          data.error ||
            'You do not have permission to update this badge.'
        )
      }

      if (!response.ok) {
        const errors = Array.isArray(data.errors)
          ? data.errors.join(', ')
          : ''

        throw new Error(
          data.error ||
            errors ||
            'Unable to upload the team badge.'
        )
      }

      const updatedTeam = data.team || data

      setBadgeUrl(updatedTeam.badge_url || '')
      clearBadgeSelection()
      setBadgeSuccessMessage(
        'Team badge updated successfully.'
      )
    } catch (error) {
      setBadgeErrorMessage(
        error.message ||
          'Unable to upload the team badge.'
      )
    } finally {
      setUploadingBadge(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedName = teamName.trim()

    if (!trimmedName) {
      setErrorMessage('Team name cannot be blank.')
      return
    }

    const token = localStorage.getItem('token')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    setSaving(true)
    setErrorMessage('')

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}`,
        {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: token,
          },
          body: JSON.stringify({
            team: {
              name: trimmedName,
              description: description.trim(),
            },
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('currentUser')
        navigate('/login', { replace: true })
        return
      }

      if (response.status === 403) {
        throw new Error(
          data.error ||
            'You do not have permission to edit this team.'
        )
      }

      if (!response.ok) {
        const errors = Array.isArray(data.errors)
          ? data.errors.join(', ')
          : ''

        throw new Error(
          data.error ||
            errors ||
            'Unable to update the team.'
        )
      }

      navigate('/team', {
        replace: true,
      })
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading team details...
      </p>
    )
  }

  const displayedBadgeUrl =
    badgePreviewUrl || badgeUrl

  const busy = saving || uploadingBadge

  return (
    <>
      <Navbar
        teamId={Number(teamId)}
        currentUser={currentUser}
      />

      <main className="dashboard-page">
        <section className="dashboard-content">
          <button
            className="back-button"
            type="button"
            onClick={() => navigate('/team')}
          >
            Back to my teams
          </button>

          <div className="dashboard-welcome">
            <p className="dashboard-label">
              Team management
            </p>

            <h1>Edit Team</h1>

            <p>
              Update your team’s badge, name and
              description.
            </p>
          </div>

          <article className="edit-team-card">
            <section className="edit-team-badge-section">
              <div className="edit-team-badge-heading">
                <h2>Team badge</h2>

                <p>
                  Upload the badge shown across your team.
                </p>
              </div>

              <div className="edit-team-badge-content">
                <div className="edit-team-badge-preview">
                  {displayedBadgeUrl ? (
                    <img
                      src={displayedBadgeUrl}
                      alt={`${teamName || 'Team'} badge`}
                    />
                  ) : (
                    <div className="edit-team-badge-placeholder">
                      <span>
                        {teamName
                          .trim()
                          .charAt(0)
                          .toUpperCase() || 'T'}
                      </span>

                      <small>No badge</small>
                    </div>
                  )}
                </div>

                <form
                  className="edit-team-badge-form"
                  onSubmit={handleBadgeUpload}
                >
                  <label htmlFor="team-badge">
                    Choose team badge
                  </label>

                  <input
                    ref={badgeInputRef}
                    id="team-badge"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleBadgeSelection}
                    disabled={busy}
                    aria-describedby="team-badge-help"
                  />

                  <small id="team-badge-help">
                    JPG, PNG or WebP. Maximum size 5 MB.
                  </small>

                  {badgeErrorMessage && (
                    <p
                      className="team-error"
                      role="alert"
                    >
                      {badgeErrorMessage}
                    </p>
                  )}

                  {badgeSuccessMessage && (
                    <p
                      className="team-success"
                      role="status"
                    >
                      {badgeSuccessMessage}
                    </p>
                  )}

                  <button
                    className="upload-team-badge-button"
                    type="submit"
                    disabled={busy || !badgeFile}
                  >
                    {uploadingBadge
                      ? 'Uploading...'
                      : badgeUrl
                        ? 'Change badge'
                        : 'Upload badge'}
                  </button>
                </form>
              </div>
            </section>

            <form
              className="edit-team-form"
              onSubmit={handleSubmit}
            >
              {errorMessage && (
                <p className="team-error" role="alert">
                  {errorMessage}
                </p>
              )}

              <div className="edit-team-form-group">
                <label htmlFor="team-name">
                  Team name
                  <span className="required-mark">
                    {' '}
                    *
                  </span>
                </label>

                <input
                  id="team-name"
                  type="text"
                  value={teamName}
                  onChange={(event) =>
                    setTeamName(event.target.value)
                  }
                  placeholder="Enter your team name"
                  disabled={busy}
                  required
                />
              </div>

              <div className="edit-team-form-group">
                <label htmlFor="team-description">
                  Team description
                </label>

                <textarea
                  id="team-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Tell players about your team"
                  rows="6"
                  disabled={busy}
                />

                <small>
                  You can leave the description blank.
                </small>
              </div>

              <div className="edit-team-actions">
                <button
                  className="save-team-button"
                  type="submit"
                  disabled={busy}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>

                <button
                  className="cancel-edit-team-button"
                  type="button"
                  disabled={busy}
                  onClick={() => navigate('/team')}
                >
                  Cancel
                </button>
              </div>
            </form>
          </article>
        </section>
      </main>
    </>
  )
}

export default EditTeamPage
