import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import './CreateTeam.css'
import API_URL from '../config/api'


function CreatTeam() {
  const navigate = useNavigate()

  const [currentUser, setCurrentUser] = useState(null)
  const [teamName, setTeamName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function fetchCurrentUser() {
      const token = localStorage.getItem('token')

      if (!token) {
        navigate('/login', { replace: true })
        return
      }

      try {
        const response = await fetch(
          `${API_URL}/users/me`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: token,
            },
          }
        )

        if (response.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('currentUser')
          navigate('/login', { replace: true })
          return
        }

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.error || 'Unable to load your account.'
          )
        }

        const user = data.user || data

        const isApprovedManager =
          user.account_type === 'manager' &&
          user.manager_verification_status === 'approved'

        if (!isApprovedManager) {
          navigate('/team', { replace: true })
          return
        }

        setCurrentUser(user)
      } catch (error) {
        setErrorMessage(
          error.message || 'Unable to connect to the server.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentUser()
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()

    const cleanedTeamName = teamName.trim()
    const cleanedDescription = description.trim()

    if (!cleanedTeamName) {
      setErrorMessage('Please enter a team name.')
      return
    }

    const token = localStorage.getItem('token')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    setSubmitting(true)
    setErrorMessage('')

    try {
      const response = await fetch(
        `${API_URL}/teams`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: token,
          },
          body: JSON.stringify({
            team: {
              name: cleanedTeamName,
              description: cleanedDescription,
            },
          }),
        }
      )

      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('currentUser')
        navigate('/login', { replace: true })
        return
      }

      let data = {}

      try {
        data = await response.json()
      } catch {
        // The response may not contain JSON.
      }

      if (!response.ok) {
        let message = 'Unable to create the team.'

        if (Array.isArray(data.errors)) {
          message = data.errors.join(', ')
        } else if (data.error) {
          message = data.error
        }

        throw new Error(message)
      }

      navigate('/team', { replace: true })
    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to connect to the server.'
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
      <Navbar currentUser={currentUser} />

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

            <h1>Create a team</h1>

            <p>
              Set up your football team and generate an invite
              code for your squad.
            </p>
          </div>

          {errorMessage && (
            <p className="team-error" role="alert">
              {errorMessage}
            </p>
          )}

          <form
            className="create-team-card create-team-form"
            onSubmit={handleSubmit}
          >
            <label htmlFor="team-name">
              <span>Team name</span>

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
                  setTeamName(event.target.value)
                }
              />
            </label>

            <label htmlFor="team-description">
              <span>Team description</span>

              <textarea
                id="team-description"
                name="description"
                value={description}
                placeholder="Tell players something about your team..."
                rows={5}
                maxLength={500}
                disabled={submitting}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
              />
            </label>

            <p className="create-team-help">
              An invite code will be generated after your team
              has been created.
            </p>

            <button
              className="create-team-button"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? 'Creating team...'
                : 'Create team'}
            </button>
          </form>
        </section>
      </main>
    </>
  )
}

export default CreatTeam
