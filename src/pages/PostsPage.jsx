import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './PostsPage.css'
import API_URL from '../config/api'

function PostsPage() {
  const { teamId } = useParams()
  const navigate = useNavigate()

  const [posts, setPosts] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadPostsPage() {
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
        const [userResponse, postsResponse] = await Promise.all([
          fetch(`${API_URL}/users/me`, { headers }),
          fetch(
            `${API_URL}/teams/${teamId}/posts`,
            { headers }
          ),
        ])

        if (userResponse.status === 401) {
          localStorage.removeItem('token')
          navigate('/login')
          return
        }

        const userData = await userResponse.json()
        const postsData = await postsResponse.json()

        if (!userResponse.ok) {
          throw new Error(
            userData.error || 'Unable to load your account.'
          )
        }

        if (!postsResponse.ok) {
          throw new Error(
            postsData.error || 'Unable to load team posts.'
          )
        }

        setCurrentUser(userData.user)
        setPosts(Array.isArray(postsData) ? postsData : [])
      } catch (error) {
        setErrorMessage(
          error.message || 'Unable to load team posts.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadPostsPage()
  }, [navigate, teamId])

  function postTypeLabel(postType) {
    if (postType === 'tactical') return 'Tactical'
    if (postType === 'announcement') return 'Announcement'

    return 'General'
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const managerCanPost =
    currentUser?.account_type === 'manager' &&
    currentUser?.manager_verification_status === 'approved'

  return (
    <>
      <Navbar
        teamId={teamId}
        currentUser={currentUser}
      />

      <main className="posts-page">
        <section className="posts-container">
          <header className="posts-header">
            <div>
              <p className="posts-label">Team communication</p>
              <h1>Team Posts</h1>

              <p>
                View announcements, tactical instructions and
                general team updates.
              </p>
            </div>

            {managerCanPost && (
              <Link
                className="create-post-link"
                to={`/teams/${teamId}/posts/new`}
              >
                Create post
              </Link>
            )}
          </header>

          {errorMessage && (
            <p className="posts-error" role="alert">
              {errorMessage}
            </p>
          )}

          {loading ? (
            <p className="posts-message">Loading posts...</p>
          ) : posts.length === 0 ? (
            <section className="posts-empty">
              <span>📣</span>
              <h2>No posts yet</h2>
              <p>
                Team announcements and tactical posts will appear
                here.
              </p>
            </section>
          ) : (
            <section className="posts-list">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  className="post-card"
                  to={`/teams/${teamId}/posts/${post.id}`}
                >
                  <div className="post-card-heading">
                    <span
                      className={`post-type post-type-${post.post_type}`}
                    >
                      {postTypeLabel(post.post_type)}
                    </span>

                    {post.pinned && (
                      <span className="post-pinned">
                        Pinned
                      </span>
                    )}
                  </div>

                  <h2>{post.title}</h2>

                  <p className="post-preview">
                    {post.content}
                  </p>

                  <div className="post-card-footer">
                    <span>
                      Posted by {post.user?.first_name || 'Manager'}
                    </span>

                    <time dateTime={post.created_at}>
                      {formatDate(post.created_at)}
                    </time>
                  </div>
                </Link>
              ))}
            </section>
          )}
        </section>
      </main>
    </>
  )
}

export default PostsPage
