import '../styles/RemainingPages.mobile.css'
import { useEffect, useState } from 'react'
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import Navbar from '../components/Navbar'
import './DeletePostPage.css'
import './DeletePostPage.mobile.css'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

function DeletePostPage() {
  const { teamId, postId } = useParams()
  const navigate = useNavigate()

  const [post, setPost] = useState(null)
  const [currentUser, setCurrentUser] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [deleting, setDeleting] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  // ========================================
  // SESSION
  // ========================================

  async function clearDeletePostSession() {
    await clearAuthToken()

    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')

    navigate('/login', {
      replace: true,
    })
  }

  // ========================================
  // LOAD PAGE
  // ========================================

  useEffect(() => {
    async function loadDeletePostPage() {
      const token = getAuthToken()

      if (!token) {
        await clearDeletePostSession()
        return
      }

      const headers = {
        Accept: 'application/json',
        Authorization: token,
      }

      try {
        const [
          userResponse,
          postResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/users/me`,
            {
              headers,
            },
          ),

          fetch(
            `${API_URL}/teams/${teamId}/posts/${postId}`,
            {
              headers,
            },
          ),
        ])

        if (
          userResponse.status === 401 ||
          postResponse.status === 401
        ) {
          await clearDeletePostSession()
          return
        }

        const userData =
          await userResponse.json()

        const postData =
          await postResponse.json()

        if (!userResponse.ok) {
          throw new Error(
            userData.error ||
              'Unable to load your account.',
          )
        }

        if (!postResponse.ok) {
          throw new Error(
            postData.error ||
              'Unable to load this post.',
          )
        }

        const user = userData.user

        const approvedManager =
          user.account_type === 'manager' &&
          user.manager_verification_status ===
            'approved'

        const canDeletePost =
          user.id === postData.user_id ||
          approvedManager

        if (!canDeletePost) {
          navigate(
            `/teams/${teamId}/posts/${postId}`,
            {
              replace: true,
            },
          )

          return
        }

        setCurrentUser(user)
        setPost(postData)
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to load this post.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadDeletePostPage()
  }, [
    navigate,
    postId,
    teamId,
  ])

  // ========================================
  // DELETE POST
  // ========================================

  async function handleDelete() {
    const token = getAuthToken()

    if (!token) {
      await clearDeletePostSession()
      return
    }

    setDeleting(true)
    setErrorMessage('')

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/posts/${postId}`,
        {
          method: 'DELETE',

          headers: {
            Accept: 'application/json',
            Authorization: token,
          },
        },
      )

      if (response.status === 401) {
        await clearDeletePostSession()
        return
      }

      if (!response.ok) {
        let message =
          'Unable to delete this post.'

        try {
          const data =
            await response.json()

          message =
            data.error ||
            message
        } catch {
          // Keep the default error message.
        }

        throw new Error(message)
      }

      navigate(
        `/teams/${teamId}/posts`,
        {
          replace: true,
        },
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to delete this post.',
      )
    } finally {
      setDeleting(false)
    }
  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <>
        <Navbar teamId={teamId} />

        <main className="delete-post-page mm-minimal-page">
          <p className="delete-post-message">
            Loading post...
          </p>
        </main>
      </>
    )
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      <Navbar
        teamId={teamId}
        currentUser={currentUser}
      />

      <main className="delete-post-page mm-minimal-page">
        <section className="delete-post-container">
          {errorMessage && (
            <p
              className="delete-post-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {post && (
            <div className="delete-post-card">
              <div className="delete-post-icon">
                !
              </div>

              <p className="delete-post-label">
                Delete post
              </p>

              <h1 className="mm-page-title">
                Are you sure?
              </h1>

              <p className="delete-post-warning">
                You are about to permanently delete:
              </p>

              <div className="delete-post-preview">
                <strong>
                  {post.title}
                </strong>

                <p>
                  {post.content}
                </p>
              </div>

              <p className="delete-post-notice">
                This action cannot be undone. Any read-tracking
                records connected to this post will also be removed.
              </p>

              <div className="delete-post-actions">
                <Link
                  className="delete-post-cancel"
                  to={`/teams/${teamId}/posts/${postId}`}
                >
                  Cancel
                </Link>

                <button
                  className="delete-post-confirm"
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting
                    ? 'Deleting...'
                    : 'Yes, delete post'}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  )
}

export default DeletePostPage
