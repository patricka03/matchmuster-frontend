import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './CreatePostPage.css'
import API_URL from '../config/api'

function EditPostPage() {
  const { teamId, postId } = useParams()
  const navigate = useNavigate()

  const [currentUser, setCurrentUser] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState('announcement')
  const [pinned, setPinned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessages, setErrorMessages] = useState([])

  useEffect(() => {
    async function loadEditPostPage() {
      const token = localStorage.getItem('token')

      if (!token) {
        navigate('/login')
        return
      }

      const headers = {
        Accept: 'application/json',
        Authorization: token,
      }

      try {
        const [userResponse, postResponse] = await Promise.all([
          fetch(`${API_URL}/users/me`, { headers }),
          fetch(
           `${API_URL}/teams/${teamId}/posts/${postId}`,
            { headers }
          ),
        ])

        if (
          userResponse.status === 401 ||
          postResponse.status === 401
        ) {
          localStorage.removeItem('token')
          navigate('/login')
          return
        }

        const userData = await userResponse.json()
        const postData = await postResponse.json()

        if (!userResponse.ok) {
          throw new Error(
            userData.error || 'Unable to load your account.'
          )
        }

        if (!postResponse.ok) {
          throw new Error(
            postData.error || 'Unable to load this post.'
          )
        }

        const user = userData.user

        const approvedManager =
          user.account_type === 'manager' &&
          user.manager_verification_status === 'approved'

        const canEditPost =
          user.id === postData.user_id || approvedManager

        if (!canEditPost) {
          navigate(
            `/teams/${teamId}/posts/${postId}`,
            { replace: true }
          )
          return
        }

        setCurrentUser(user)
        setTitle(postData.title || '')
        setContent(postData.content || '')
        setPostType(postData.post_type || 'announcement')
        setPinned(Boolean(postData.pinned))
      } catch (error) {
        setErrorMessages([
          error.message || 'Unable to load this post.',
        ])
      } finally {
        setLoading(false)
      }
    }

    loadEditPostPage()
  }, [navigate, postId, teamId])

  async function handleSubmit(event) {
    event.preventDefault()

    const token = localStorage.getItem('token')

    if (!token) {
      navigate('/login')
      return
    }

    setSubmitting(true)
    setErrorMessages([])

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/posts/${postId}`,
        {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: token,
          },
          body: JSON.stringify({
            post: {
              title: title.trim(),
              content: content.trim(),
              post_type: postType,
              pinned,
            },
          }),
        }
      )

      if (response.status === 401) {
        localStorage.removeItem('token')
        navigate('/login')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        const errors = Array.isArray(data.errors)
          ? data.errors
          : [data.error || 'Unable to update the post.']

        setErrorMessages(errors)
        return
      }

      navigate(`/teams/${teamId}/posts/${postId}`)
    } catch {
      setErrorMessages([
        'Unable to connect to the server. Please try again.',
      ])
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar teamId={teamId} />

        <main className="create-post-page">
          <p className="create-post-message">
            Loading post...
          </p>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar
        teamId={teamId}
        currentUser={currentUser}
      />

      <main className="create-post-page">
        <section className="create-post-container">
          <Link
            className="app-back-button"
            to={`/teams/${teamId}/posts/${postId}`}
          >
            ← Back to post
          </Link>

          <header className="create-post-header">
            <p className="create-post-label">
              Team communication
            </p>

            <h1>Edit post</h1>

            <p>
              Update the post’s title, type, message or pinned
              status.
            </p>
          </header>

          <form
            className="create-post-form"
            onSubmit={handleSubmit}
          >
            {errorMessages.length > 0 && (
              <div
                className="create-post-errors"
                role="alert"
              >
                <strong>We couldn’t update the post:</strong>

                <ul>
                  {errorMessages.map((error, index) => (
                    <li key={`${error}-${index}`}>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="create-post-field">
              <label htmlFor="post-title">Title</label>

              <input
                id="post-title"
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="e.g. Sunday match instructions"
                maxLength={150}
                required
              />

              <span className="create-post-character-count">
                {title.length}/150
              </span>
            </div>

            <fieldset className="create-post-fieldset">
              <legend>Post type</legend>

              <div className="post-type-options">
                <label
                  className={`post-type-option ${
                    postType === 'announcement'
                      ? 'post-type-option-selected'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="postType"
                    value="announcement"
                    checked={postType === 'announcement'}
                    onChange={(event) =>
                      setPostType(event.target.value)
                    }
                  />

                  <span className="post-type-option-icon">
                    📣
                  </span>

                  <span>
                    <strong>Announcement</strong>
                    <small>
                      Important club or team information
                    </small>
                  </span>
                </label>

                <label
                  className={`post-type-option ${
                    postType === 'tactical'
                      ? 'post-type-option-selected'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="postType"
                    value="tactical"
                    checked={postType === 'tactical'}
                    onChange={(event) =>
                      setPostType(event.target.value)
                    }
                  />

                  <span className="post-type-option-icon">
                    🧠
                  </span>

                  <span>
                    <strong>Tactical</strong>
                    <small>
                      Formation, roles and match instructions
                    </small>
                  </span>
                </label>

                <label
                  className={`post-type-option ${
                    postType === 'general'
                      ? 'post-type-option-selected'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="postType"
                    value="general"
                    checked={postType === 'general'}
                    onChange={(event) =>
                      setPostType(event.target.value)
                    }
                  />

                  <span className="post-type-option-icon">
                    💬
                  </span>

                  <span>
                    <strong>General</strong>
                    <small>
                      Everyday team news and discussion
                    </small>
                  </span>
                </label>
              </div>
            </fieldset>

            <div className="create-post-field">
              <label htmlFor="post-content">Message</label>

              <textarea
                id="post-content"
                value={content}
                onChange={(event) =>
                  setContent(event.target.value)
                }
                placeholder="Write your message to the team..."
                rows={10}
                required
              />
            </div>

            <label className="create-post-pin-option">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(event) =>
                  setPinned(event.target.checked)
                }
              />

              <span>
                <strong>Pin this post</strong>
                <small>
                  Keep it at the top of the team posts page
                </small>
              </span>
            </label>

            <div className="create-post-actions">
              <Link
                className="create-post-cancel"
                to={`/teams/${teamId}/posts/${postId}`}
              >
                Cancel
              </Link>

              <button
                className="create-post-submit"
                type="submit"
                disabled={
                  submitting ||
                  !title.trim() ||
                  !content.trim()
                }
              >
                {submitting ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  )
}

export default EditPostPage
