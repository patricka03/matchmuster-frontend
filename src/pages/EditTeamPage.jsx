import { useEffect, useState } from 'react'
import { useNavigate, useParams, } from 'react-router-dom'
import Navbar from '../components/Navbar'
import API_URL from '../config/api'


function EditTeamPage() {
  const { teamId } = useParams()
  const navigate = useNavigate()

  const [currentUser, setCurrentUser] = useState(null)
  const [teamName, setTeamName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

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
            userData.error || 'Unable to load your account.'
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
      } catch (error) {
        setErrorMessage(
          error.message || 'Unable to connect to the server.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchEditTeamPage()
  }, [navigate, teamId])

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
        throw new Error(
          data.error ||
            data.errors?.join(', ') ||
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
            <span>←</span>
            Back to my teams
          </button>

          <div className="dashboard-welcome">
            <p className="dashboard-label">
              Team management
            </p>

            <h1>Edit Team</h1>

            <p>
              Update your team’s name and description.
            </p>
          </div>

          <article className="edit-team-card">
            {errorMessage && (
              <p className="team-error" role="alert">
                {errorMessage}
              </p>
            )}

            <form
              className="edit-team-form"
              onSubmit={handleSubmit}
            >
              <div className="edit-team-form-group">
                <label htmlFor="team-name">
                  Team name
                  <span className="required-mark"> *</span>
                </label>

                <input
                  id="team-name"
                  type="text"
                  value={teamName}
                  onChange={(event) =>
                    setTeamName(event.target.value)
                  }
                  placeholder="Enter your team name"
                  disabled={saving}
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
                  disabled={saving}
                />

                <small>
                  You can leave the description blank.
                </small>
              </div>

              <div className="edit-team-actions">
                <button
                  className="save-team-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>

                <button
                  className="cancel-edit-team-button"
                  type="button"
                  disabled={saving}
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
