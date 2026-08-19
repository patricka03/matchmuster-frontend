import { useEffect, useState } from 'react'
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import Navbar from '../components/Navbar'
import ReportModal from '../components/ReportModal'
import './PostPage.css'
import './PostPage.mobile.css'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

function PostPage() {
  const { teamId, postId } =
    useParams()

  const navigate =
    useNavigate()

  const [post, setPost] =
    useState(null)

  const [currentUser, setCurrentUser] =
    useState(null)

  const [postReads, setPostReads] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [deleting, setDeleting] =
    useState(false)

  const [
    isBlockingAuthor,
    setIsBlockingAuthor,
  ] = useState(false)

  const [
    isReportModalOpen,
    setIsReportModalOpen,
  ] = useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [safetyMessage, setSafetyMessage] =
    useState('')

  // ========================================
  // SESSION
  // ========================================

  async function clearPostSession() {
    await clearAuthToken()

    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')

    navigate('/login', {
      replace: true,
    })
  }

  // ========================================
  // LOAD POST
  // ========================================

  useEffect(() => {
    async function loadPostPage() {
      const token =
        getAuthToken()

      if (!token) {
        await clearPostSession()
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
          await clearPostSession()
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

        const loadedUser =
          userData.user

        setCurrentUser(
          loadedUser,
        )

        setPost(
          postData,
        )

        const canViewReads =
          loadedUser.account_type ===
            'manager' &&
          loadedUser.manager_verification_status ===
            'approved' &&
          [
            'announcement',
            'tactical',
          ].includes(
            postData.post_type,
          )

        if (canViewReads) {
          await loadPostReads(
            headers,
          )
        }
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to load this post.',
        )
      } finally {
        setLoading(false)
      }
    }

    async function loadPostReads(
      headers,
    ) {
      const response =
        await fetch(
          `${API_URL}/teams/${teamId}/posts/${postId}/post_reads`,
          {
            headers,
          },
        )

      if (
        response.status === 401
      ) {
        await clearPostSession()
        return
      }

      if (!response.ok) {
        return
      }

      const data =
        await response.json()

      setPostReads(
        Array.isArray(data)
          ? data
          : [],
      )
    }

    loadPostPage()
  }, [
    navigate,
    postId,
    teamId,
  ])

  // ========================================
  // DELETE POST
  // ========================================

  async function handleDelete() {
    const confirmed =
      window.confirm(
        'Are you sure you want to delete this post?',
      )

    if (!confirmed) {
      return
    }

    const token =
      getAuthToken()

    if (!token) {
      await clearPostSession()
      return
    }

    setDeleting(true)
    setErrorMessage('')

    try {
      const response =
        await fetch(
          `${API_URL}/teams/${teamId}/posts/${postId}`,
          {
            method: 'DELETE',

            headers: {
              Accept:
                'application/json',

              Authorization:
                token,
            },
          },
        )

      if (
        response.status === 401
      ) {
        await clearPostSession()
        return
      }

      if (!response.ok) {
        const data =
          await response.json()

        throw new Error(
          data.error ||
            'Unable to delete this post.',
        )
      }

      navigate(
        `/teams/${teamId}/posts`,
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
  // BLOCK AUTHOR
  // ========================================

  async function handleBlockAuthor() {
    const authorId =
      post?.user_id ||
      post?.user?.id

    if (!authorId) {
      setErrorMessage(
        'Unable to identify the author of this post.',
      )

      return
    }

    const authorName =
      [
        post?.user?.first_name,
        post?.user?.last_name,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      'this member'

    const confirmed =
      window.confirm(
        `Block ${authorName}? Their posts and activity will be hidden from you.`,
      )

    if (!confirmed) {
      return
    }

    const token =
      getAuthToken()

    if (!token) {
      await clearPostSession()
      return
    }

    setIsBlockingAuthor(true)
    setErrorMessage('')
    setSafetyMessage('')

    try {
      const response =
        await fetch(
          `${API_URL}/user_blocks`,
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
                user_block: {
                  blocked_user_id:
                    authorId,
                },
              }),
          },
        )

      const data =
        await readResponse(
          response,
        )

      if (
        response.status === 401
      ) {
        await clearPostSession()
        return
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Unable to block ${authorName}.`,
          ),
        )
      }

      setSafetyMessage(
        `${authorName} has been blocked. You can manage blocked accounts from your profile.`,
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          `Unable to block ${authorName}.`,
      )
    } finally {
      setIsBlockingAuthor(false)
    }
  }

  // ========================================
  // HELPERS
  // ========================================

  function formatDate(date) {
    if (!date) {
      return ''
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(
      new Date(date),
    )
  }

  function postTypeLabel(
    postType,
  ) {
    if (
      postType === 'announcement'
    ) {
      return 'Announcement'
    }

    if (
      postType === 'tactical'
    ) {
      return 'Tactical'
    }

    return 'General'
  }

  function readerName(
    postRead,
  ) {
    const firstName =
      postRead.user?.first_name ||
      ''

    const lastName =
      postRead.user?.last_name ||
      ''

    const fullName =
      `${firstName} ${lastName}`.trim()

    return (
      fullName ||
      'Team member'
    )
  }

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <>
        <Navbar teamId={teamId} />

        <main className="post-page">
          <p className="post-page-message">
            Loading post...
          </p>
        </main>
      </>
    )
  }

  const approvedManager =
    currentUser?.account_type ===
      'manager' &&
    currentUser?.manager_verification_status ===
      'approved'

  const canManagePost =
    currentUser?.id ===
      post?.user_id ||
    approvedManager

  const tracksReads =
    [
      'announcement',
      'tactical',
    ].includes(
      post?.post_type,
    )

  const postAuthorId =
    post?.user_id ||
    post?.user?.id

  const canUseSafetyTools =
    Boolean(postAuthorId) &&
    Boolean(currentUser?.id) &&
    String(postAuthorId) !==
      String(currentUser.id)

  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      <Navbar
        teamId={teamId}
        currentUser={currentUser}
      />

      <main className="post-page">
        <section className="post-page-container">
          <Link
            className="app-back-button"
            to={`/teams/${teamId}/posts`}
          >
            Back to posts
          </Link>

          {errorMessage && (
            <p
              className="post-page-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {safetyMessage && (
            <p
              className="post-page-safety-success"
              role="status"
            >
              {safetyMessage}
            </p>
          )}

          {post && (
            <>
              <article className="post-details-card">
                <header className="post-details-header">
                  <div className="post-details-badges">
                    <span
                      className={`post-details-type post-details-type-${post.post_type}`}
                    >
                      {postTypeLabel(
                        post.post_type,
                      )}
                    </span>

                    {post.pinned && (
                      <span className="post-details-pinned">
                        Pinned
                      </span>
                    )}
                  </div>

                  {canManagePost && (
                    <div className="post-management-actions">
                      <Link
                        className="post-edit-link"
                        to={`/teams/${teamId}/posts/${postId}/edit`}
                      >
                        Edit
                      </Link>

                      <button
                        className="post-delete-button"
                        type="button"
                        onClick={
                          handleDelete
                        }
                        disabled={
                          deleting
                        }
                      >
                        {deleting
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </div>
                  )}
                </header>

                <h1>
                  {post.title}
                </h1>

                <div className="post-author-details">
                  <span>
                    Posted by{' '}
                    <strong>
                      {post.user?.first_name ||
                        'Team member'}
                    </strong>
                  </span>

                  <time
                    dateTime={
                      post.created_at
                    }
                  >
                    {formatDate(
                      post.created_at,
                    )}
                  </time>
                </div>

                <div className="post-content">
                  {post.content}
                </div>

                {canUseSafetyTools && (
                  <div className="post-safety-actions">
                    <span>
                      Something wrong with this post or its author?
                    </span>

                    <div>
                      <button
                        className="post-report-button"
                        type="button"
                        onClick={() => {
                          setErrorMessage('')
                          setSafetyMessage('')
                          setIsReportModalOpen(
                            true,
                          )
                        }}
                      >
                        Report post
                      </button>

                      <button
                        className="post-block-button"
                        type="button"
                        onClick={
                          handleBlockAuthor
                        }
                        disabled={
                          isBlockingAuthor
                        }
                      >
                        {isBlockingAuthor
                          ? 'Blocking…'
                          : 'Block author'}
                      </button>
                    </div>
                  </div>
                )}
              </article>

              {approvedManager &&
                tracksReads && (
                  <section className="post-read-section">
                    <header className="post-read-header">
                      <div>
                        <p className="post-read-label">
                          Read tracking
                        </p>

                        <h2>
                          Viewed by players
                        </h2>
                      </div>

                      <span className="post-read-count">
                        {
                          postReads.length
                        }
                      </span>
                    </header>

                    {postReads.length ===
                    0 ? (
                      <div className="post-read-empty">
                        <p>
                          No team members have viewed this post yet.
                        </p>
                      </div>
                    ) : (
                      <div className="post-read-list">
                        {postReads.map(
                          (
                            postRead,
                          ) => (
                            <div
                              className="post-reader"
                              key={
                                postRead.id
                              }
                            >
                              <div className="post-reader-avatar">
                                {readerName(
                                  postRead,
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {readerName(
                                    postRead,
                                  )}
                                </strong>

                                <p>
                                  Viewed{' '}
                                  {formatDate(
                                    postRead.read_at,
                                  )}
                                </p>
                              </div>

                              <span className="post-read-tick">
                                ✓
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </section>
                )}
            </>
          )}
        </section>
      </main>

      <ReportModal
        isOpen={
          isReportModalOpen
        }
        onClose={() =>
          setIsReportModalOpen(
            false,
          )
        }
        reportableType="Post"
        reportableId={
          post?.id
        }
        reportedUserId={
          postAuthorId
        }
        targetLabel="this post"
        onReported={() =>
          setSafetyMessage(
            'Thank you. Your report has been sent privately to the MatchMuster moderation team.',
          )
        }
      />
    </>
  )
}

async function readResponse(
  response,
) {
  const responseText =
    await response.text()

  if (!responseText) {
    return {}
  }

  try {
    return JSON.parse(
      responseText,
    )
  } catch {
    return {}
  }
}

function getErrorMessage(
  data,
  fallbackMessage,
) {
  if (
    Array.isArray(data.errors)
  ) {
    return data.errors.join(', ')
  }

  return (
    data.error ||
    data.message ||
    fallbackMessage
  )
}

export default PostPage
