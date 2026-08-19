import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BlockedUsersModal from '../components/BlockedUsersModal'
import './EditProfilePage.css'
import './EditProfilePage.mobile.css'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

const POSITIONS = [
  'GK',
  'CB',
  'LB',
  'RB',
  'CDM',
  'CM',
  'LW',
  'RW',
  'ST',
]

function EditProfilePage() {
  const navigate = useNavigate()

  const [currentUser, setCurrentUser] =
    useState(null)

  const [activeModal, setActiveModal] =
    useState(null)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
  })

  const [passwordData, setPasswordData] =
    useState({
      current_password: '',
      password: '',
      password_confirmation: '',
    })

  const [deletePassword, setDeletePassword] =
    useState('')

  const [
    deleteConfirmed,
    setDeleteConfirmed,
  ] = useState(false)

  const [
    preferredPosition,
    setPreferredPosition,
  ] = useState('')

  const [
    selectedAvatar,
    setSelectedAvatar,
  ] = useState(null)

  const [
    avatarPreview,
    setAvatarPreview,
  ] = useState('')

  const [isLoading, setIsLoading] =
    useState(true)

  const [
    isSavingProfile,
    setIsSavingProfile,
  ] = useState(false)

  const [
    isSavingPosition,
    setIsSavingPosition,
  ] = useState(false)

  const [
    isUploadingAvatar,
    setIsUploadingAvatar,
  ] = useState(false)

  const [
    isChangingPassword,
    setIsChangingPassword,
  ] = useState(false)

  const [
    isSigningOut,
    setIsSigningOut,
  ] = useState(false)

  const [
    isDeletingAccount,
    setIsDeletingAccount,
  ] = useState(false)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('')

  // ========================================
  // SESSION
  // ========================================

  async function clearSession() {
    await clearAuthToken()

    localStorage.removeItem(
      'currentUser',
    )

    localStorage.removeItem(
      'activeTeamId',
    )

    localStorage.removeItem(
      'activeTeamName',
    )

    navigate('/login', {
      replace: true,
    })
  }

  // ========================================
  // LOAD PROFILE
  // ========================================

  useEffect(() => {
    async function loadProfile() {
      const token = getAuthToken()

      if (!token) {
        await clearSession()
        return
      }

      try {
        const response = await fetch(
          `${API_URL}/users/me`,
          {
            headers: {
              Accept:
                'application/json',

              Authorization:
                token,
            },
          },
        )

        const data =
          await readResponse(
            response,
          )

        if (
          response.status === 401
        ) {
          await clearSession()
          return
        }

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              'Unable to load your profile.',
            ),
          )
        }

        const user =
          data.user ||
          data

        setCurrentUser(user)

        setFormData({
          first_name:
            user.first_name || '',

          last_name:
            user.last_name || '',

          email:
            user.email || '',
        })

        setPreferredPosition(
          user.preferred_position || '',
        )

        localStorage.setItem(
          'currentUser',
          JSON.stringify(user),
        )
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to load your profile.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

  // ========================================
  // MODAL KEYBOARD / BODY LOCK
  // ========================================

  useEffect(() => {
    if (!activeModal) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow =
      'hidden'

    document.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      document.body.style.overflow =
        previousOverflow

      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [activeModal])

  // ========================================
  // MODALS
  // ========================================

  function openModal(modalName) {
    setErrorMessage('')
    setSuccessMessage('')

    if (modalName === 'details') {
      setFormData({
        first_name:
          currentUser?.first_name || '',

        last_name:
          currentUser?.last_name || '',

        email:
          currentUser?.email || '',
      })
    }

    if (modalName === 'position') {
      setPreferredPosition(
        currentUser?.preferred_position ||
          '',
      )
    }

    if (modalName === 'password') {
      setPasswordData({
        current_password: '',
        password: '',
        password_confirmation: '',
      })
    }

    if (
      modalName ===
      'delete-account'
    ) {
      setDeletePassword('')
      setDeleteConfirmed(false)
    }

    setActiveModal(modalName)
  }

  function closeModal() {
    if (isDeletingAccount) {
      return
    }

    setActiveModal(null)
    setErrorMessage('')
    setDeletePassword('')
    setDeleteConfirmed(false)
  }

  // ========================================
  // FORM CHANGE
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

  function handlePasswordChange(
    event,
  ) {
    const {
      name,
      value,
    } = event.target

    setPasswordData(
      (currentPasswordData) => ({
        ...currentPasswordData,
        [name]: value,
      }),
    )
  }

  // ========================================
  // AVATAR
  // ========================================

  function handleAvatarChange(
    event,
  ) {
    const file =
      event.target.files?.[0]

    setErrorMessage('')
    setSuccessMessage('')

    if (!file) {
      return
    }

    if (
      !file.type.startsWith(
        'image/',
      )
    ) {
      setErrorMessage(
        'Please select an image file.',
      )

      event.target.value = ''

      return
    }

    const maximumFileSize =
      10 * 1024 * 1024

    if (
      file.size >
      maximumFileSize
    ) {
      setErrorMessage(
        'Your image must be smaller than 10 MB.',
      )

      event.target.value = ''

      return
    }

    setSelectedAvatar(file)

    const reader =
      new FileReader()

    reader.onloadend = () => {
      setAvatarPreview(
        reader.result,
      )
    }

    reader.readAsDataURL(file)
  }

  async function handleAvatarUpload() {
    if (
      !selectedAvatar ||
      isUploadingAvatar
    ) {
      return
    }

    const token = getAuthToken()

    if (!token) {
      await clearSession()
      return
    }

    setIsUploadingAvatar(true)
    setErrorMessage('')
    setSuccessMessage('')

    const avatarData =
      new FormData()

    avatarData.append(
      'avatar',
      selectedAvatar,
    )

    try {
      const response = await fetch(
        `${API_URL}/users/avatar`,
        {
          method: 'PATCH',

          headers: {
            Accept:
              'application/json',

            Authorization:
              token,
          },

          body: avatarData,
        },
      )

      const data =
        await readResponse(
          response,
        )

      if (
        response.status === 401
      ) {
        await clearSession()
        return
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Unable to update your profile picture.',
          ),
        )
      }

      const updatedUser =
        data.user || {
          ...currentUser,
          avatar_url:
            data.avatar_url,
        }

      setCurrentUser(
        updatedUser,
      )

      setSelectedAvatar(null)
      setAvatarPreview('')

      localStorage.setItem(
        'currentUser',
        JSON.stringify(
          updatedUser,
        ),
      )

      setSuccessMessage(
        'Profile picture updated successfully.',
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to update your profile picture.',
      )
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // ========================================
  // PROFILE DETAILS
  // ========================================

  async function handleProfileSubmit(
    event,
  ) {
    event.preventDefault()

    const token = getAuthToken()

    if (!token) {
      await clearSession()
      return
    }

    setIsSavingProfile(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch(
        `${API_URL}/users/profile`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',

            Accept:
              'application/json',

            Authorization:
              token,
          },

          body: JSON.stringify({
            user: formData,
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
        await clearSession()
        return
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Unable to update your profile.',
          ),
        )
      }

      const updatedUser =
        data.user ||
        data

      setCurrentUser(
        updatedUser,
      )

      setFormData({
        first_name:
          updatedUser.first_name ||
          '',

        last_name:
          updatedUser.last_name ||
          '',

        email:
          updatedUser.email ||
          '',
      })

      setPreferredPosition(
        updatedUser.preferred_position ||
          '',
      )

      localStorage.setItem(
        'currentUser',
        JSON.stringify(
          updatedUser,
        ),
      )

      setActiveModal(null)

      setSuccessMessage(
        'Profile updated successfully.',
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to update your profile.',
      )
    } finally {
      setIsSavingProfile(false)
    }
  }

  // ========================================
  // PREFERRED POSITION
  // ========================================

  async function handlePreferredPositionSubmit(
    event,
  ) {
    event.preventDefault()

    const token = getAuthToken()

    if (!token) {
      await clearSession()
      return
    }

    setIsSavingPosition(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch(
        `${API_URL}/users/preferred_position`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',

            Accept:
              'application/json',

            Authorization:
              token,
          },

          body: JSON.stringify({
            team_membership: {
              preferred_position:
                preferredPosition,
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
        await clearSession()
        return
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Unable to update your preferred position.',
          ),
        )
      }

      const updatedUser = {
        ...currentUser,

        preferred_position:
          data.preferred_position,
      }

      setCurrentUser(
        updatedUser,
      )

      setPreferredPosition(
        data.preferred_position,
      )

      localStorage.setItem(
        'currentUser',
        JSON.stringify(
          updatedUser,
        ),
      )

      setActiveModal(null)

      setSuccessMessage(
        'Preferred position updated successfully.',
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to update your preferred position.',
      )
    } finally {
      setIsSavingPosition(false)
    }
  }

  // ========================================
  // CHANGE PASSWORD
  // ========================================

  async function handlePasswordSubmit(
    event,
  ) {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')

    if (
      passwordData.password !==
      passwordData.password_confirmation
    ) {
      setErrorMessage(
        'Your new passwords do not match.',
      )

      return
    }

    if (
      passwordData.password.length <
      6
    ) {
      setErrorMessage(
        'Your new password must contain at least 6 characters.',
      )

      return
    }

    const token = getAuthToken()

    if (!token) {
      await clearSession()
      return
    }

    setIsChangingPassword(true)

    try {
      const response = await fetch(
        `${API_URL}/users/change_password`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',

            Accept:
              'application/json',

            Authorization:
              token,
          },

          body: JSON.stringify({
            user: passwordData,
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
        await clearSession()
        return
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Unable to change your password.',
          ),
        )
      }

      setPasswordData({
        current_password: '',
        password: '',
        password_confirmation: '',
      })

      setActiveModal(null)

      setSuccessMessage(
        data.message ||
          'Password updated successfully. Signing you out...',
      )

      /*
       * Password changes invalidate
       * the current MatchMuster session.
       */
      await clearAuthToken()

      localStorage.removeItem(
        'currentUser',
      )

      localStorage.removeItem(
        'activeTeamId',
      )

      localStorage.removeItem(
        'activeTeamName',
      )

      window.setTimeout(() => {
        navigate('/login', {
          replace: true,
        })
      }, 1800)
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to change your password.',
      )
    } finally {
      setIsChangingPassword(false)
    }
  }

  // ========================================
  // SIGN OUT
  // ========================================

  async function handleSignOut() {
    if (isSigningOut) {
      return
    }

    const token = getAuthToken()

    setIsSigningOut(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      if (token) {
        await fetch(
          `${API_URL}/users/sign_out`,
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
      }
    } catch {
      /*
       * Still clear the device session
       * if Rails is temporarily unavailable.
       */
    } finally {
      await clearSession()
    }
  }

  // ========================================
  // DELETE ACCOUNT
  // ========================================

  async function handleDeleteAccount(
    event,
  ) {
    event.preventDefault()

    setErrorMessage('')
    setSuccessMessage('')

    if (
      !deletePassword.trim()
    ) {
      setErrorMessage(
        'Enter your current password to delete your account.',
      )

      return
    }

    if (!deleteConfirmed) {
      setErrorMessage(
        'Please confirm that you understand account deletion is permanent.',
      )

      return
    }

    const token = getAuthToken()

    if (!token) {
      await clearSession()
      return
    }

    setIsDeletingAccount(true)

    try {
      const response = await fetch(
        `${API_URL}/users/account`,
        {
          method: 'DELETE',

          headers: {
            'Content-Type':
              'application/json',

            Accept:
              'application/json',

            Authorization:
              token,
          },

          body: JSON.stringify({
            current_password:
              deletePassword,
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
        await clearSession()
        return
      }

      if (!response.ok) {
        if (
          response.status === 409 &&
          data.teams?.length
        ) {
          throw new Error(
            `${
              data.message ||
              data.error
            } Team: ${data.teams.join(
              ', ',
            )}.`,
          )
        }

        throw new Error(
          getErrorMessage(
            data,
            'Unable to delete your account.',
          ),
        )
      }

      /*
       * The account no longer exists,
       * so remove the JWT from native
       * secure storage immediately.
       */
      await clearAuthToken()

      localStorage.removeItem(
        'currentUser',
      )

      localStorage.removeItem(
        'activeTeamId',
      )

      localStorage.removeItem(
        'activeTeamName',
      )

      navigate('/', {
        replace: true,

        state: {
          successMessage:
            data.message ||
            'Your MatchMuster account has been deleted.',
        },
      })
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to delete your account.',
      )
    } finally {
      setIsDeletingAccount(false)
    }
  }

  // ========================================
  // DISPLAY HELPERS
  // ========================================

  function userInitials() {
    const firstName =
      currentUser?.first_name ||
      ''

    const lastName =
      currentUser?.last_name ||
      ''

    return (
      `${firstName.charAt(
        0,
      )}${lastName.charAt(
        0,
      )}`.toUpperCase() ||
      'U'
    )
  }

  function fullName() {
    return [
      currentUser?.first_name,
      currentUser?.last_name,
    ]
      .filter(Boolean)
      .join(' ')
  }

  // ========================================
  // LOADING
  // ========================================

  if (isLoading) {
    return (
      <>
        <Navbar />

        <main className="edit-profile-page">
          <p className="profile-loading">
            Loading your profile...
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
        currentUser={currentUser}
      />

      <main className="edit-profile-page">
        <section className="edit-profile-card">
          <div className="edit-profile-heading">
            <div>
              <h1>
                Profile &amp; Settings
              </h1>

              <p>
                Manage your personal
                MatchMuster account.
              </p>
            </div>

            <Link
              className="app-back-button"
              to="/dashboard"
            >
              Back to dashboard
            </Link>
          </div>

          {errorMessage &&
            !activeModal && (
              <p
                className="auth-error"
                role="alert"
              >
                {errorMessage}
              </p>
            )}

          {successMessage && (
            <p
              className="profile-success"
              role="status"
            >
              {successMessage}
            </p>
          )}

          {/* ========================================
              PROFILE OVERVIEW
          ======================================== */}

          <section className="profile-overview">
            <div className="profile-avatar-preview">
              {avatarPreview ||
              currentUser?.avatar_url ? (
                <img
                  src={
                    avatarPreview ||
                    currentUser.avatar_url
                  }
                  alt={`${
                    fullName() ||
                    'User'
                  } profile`}
                />
              ) : (
                <span>
                  {userInitials()}
                </span>
              )}
            </div>

            <div className="profile-overview-details">
              <h2>
                {fullName() ||
                  'MatchMuster user'}
              </h2>

              <p>
                {currentUser?.email}
              </p>

              <span className="profile-account-badge">
                {formatLabel(
                  currentUser?.account_type,
                )}
              </span>
            </div>
          </section>

          {/* ========================================
              PROFILE PICTURE
          ======================================== */}

          <section className="profile-picture-section">
            <div>
              <h2>
                Profile picture
              </h2>

              <p>
                Choose an image under
                10 MB.
              </p>
            </div>

            <div className="profile-picture-actions">
              <label
                className="profile-file-label"
                htmlFor="profile-avatar"
              >
                Choose picture
              </label>

              <input
                id="profile-avatar"
                type="file"
                accept="image/*"
                onChange={
                  handleAvatarChange
                }
              />

              <button
                type="button"
                className="profile-primary-button"
                onClick={
                  handleAvatarUpload
                }
                disabled={
                  !selectedAvatar ||
                  isUploadingAvatar
                }
              >
                {isUploadingAvatar
                  ? 'Uploading...'
                  : 'Upload'}
              </button>
            </div>
          </section>

          {/* ========================================
              ACCOUNT DETAILS
          ======================================== */}

          <section className="profile-settings-section">
            <div className="profile-section-heading">
              <h2>
                Account details
              </h2>

              <p>
                Select an item to
                update it.
              </p>
            </div>

            <div className="profile-settings-list">
              <div className="profile-setting-row">
                <div>
                  <span className="profile-setting-label">
                    Personal details
                  </span>

                  <strong>
                    {fullName() ||
                      'Not provided'}
                  </strong>

                  <small>
                    {currentUser?.email}
                  </small>
                </div>

                <button
                  type="button"
                  className="profile-edit-button"
                  onClick={() =>
                    openModal(
                      'details',
                    )
                  }
                >
                  Edit
                </button>
              </div>

              {currentUser?.account_type ===
                'player' && (
                <div className="profile-setting-row">
                  <div>
                    <span className="profile-setting-label">
                      Preferred position
                    </span>

                    <strong>
                      {currentUser.preferred_position ||
                        'Not selected'}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="profile-edit-button"
                    onClick={() =>
                      openModal(
                        'position',
                      )
                    }
                  >
                    Edit
                  </button>
                </div>
              )}

              <div className="profile-setting-row">
                <div>
                  <span className="profile-setting-label">
                    Password
                  </span>

                  <strong>
                    ••••••••
                  </strong>

                  <small>
                    Changing it will
                    sign you out
                    securely.
                  </small>
                </div>

                <button
                  type="button"
                  className="profile-edit-button"
                  onClick={() =>
                    openModal(
                      'password',
                    )
                  }
                >
                  Change
                </button>
              </div>

              <div className="profile-setting-row profile-setting-read-only">
                <div>
                  <span className="profile-setting-label">
                    Account type
                  </span>

                  <strong>
                    {formatLabel(
                      currentUser?.account_type,
                    )}
                  </strong>

                  <small>
                    This cannot be
                    changed from profile
                    settings.
                  </small>
                </div>

                <span className="profile-read-only-badge">
                  Read only
                </span>
              </div>

              {currentUser?.account_type ===
                'manager' && (
                <div className="profile-setting-row profile-setting-read-only">
                  <div>
                    <span className="profile-setting-label">
                      Manager
                      verification
                    </span>

                    <strong>
                      {formatLabel(
                        currentUser.manager_verification_status,
                      )}
                    </strong>

                    <small>
                      Verification is
                      controlled by
                      MatchMuster.
                    </small>
                  </div>

                  <span className="profile-read-only-badge">
                    Read only
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* =====================================
              SAFETY & BLOCKING
          ===================================== */}

          <section className="profile-settings-section">
            <div className="profile-section-heading">
              <h2>
                Safety &amp; blocking
              </h2>

              <p>
                Review the accounts you
                have blocked and restore
                access whenever you choose.
              </p>
            </div>

            <div className="profile-settings-list">
              <div className="profile-setting-row">
                <div>
                  <span className="profile-setting-label">
                    Blocked accounts
                  </span>

                  <strong>
                    Manage blocked members
                  </strong>

                  <small>
                    Unblock someone to see
                    their content and activity
                    again.
                  </small>
                </div>

                <button
                  type="button"
                  className="profile-edit-button"
                  onClick={() =>
                    openModal(
                      'blocked-users',
                    )
                  }
                >
                  Manage
                </button>
              </div>
            </div>
          </section>

          {/* =====================================
              LEGAL & PRIVACY
          ===================================== */}

          <section className="profile-settings-section">
            <div className="profile-section-heading">
              <h2>
                Legal &amp; privacy
              </h2>

              <p>
                Review MatchMuster
                policies and privacy
                information.
              </p>
            </div>

            <div className="profile-settings-list">
              <div className="profile-setting-row">
                <div>
                  <span className="profile-setting-label">
                    Legal &amp; privacy
                  </span>

                  <strong>
                    Terms, privacy and
                    community rules
                  </strong>

                  <small>
                    Review the policies
                    that apply when using
                    MatchMuster.
                  </small>
                </div>

                <Link
                  className="profile-edit-button profile-setting-link"
                  to="/legal"
                >
                  View
                </Link>
              </div>
            </div>
          </section>

          {/* =====================================
              SESSION
          ===================================== */}

          <section className="profile-settings-section">
            <div className="profile-section-heading">
              <h2>
                Session
              </h2>

              <p>
                Sign out of MatchMuster on
                this device.
              </p>
            </div>

            <div className="profile-settings-list">
              <div className="profile-setting-row">
                <div>
                  <span className="profile-setting-label">
                    Sign out
                  </span>

                  <strong>
                    End this session
                  </strong>

                  <small>
                    You can sign back in
                    again at any time.
                  </small>
                </div>

                <button
                  type="button"
                  className="profile-edit-button"
                  onClick={
                    handleSignOut
                  }
                  disabled={
                    isSigningOut
                  }
                >
                  {isSigningOut
                    ? 'Signing out...'
                    : 'Sign out'}
                </button>
              </div>
            </div>
          </section>

          {/* =====================================
              DELETE ACCOUNT
          ===================================== */}

          <section className="profile-danger-section">
            <div className="profile-danger-heading">
              <div>
                <h2>
                  Delete account
                </h2>

                <p>
                  Permanently close your
                  MatchMuster account and
                  remove your personal
                  account information where
                  applicable.
                </p>
              </div>

              <button
                type="button"
                className="profile-delete-button"
                onClick={() =>
                  openModal(
                    'delete-account',
                  )
                }
              >
                Delete account
              </button>
            </div>
          </section>
        </section>

        <BlockedUsersModal
          isOpen={
            activeModal ===
            'blocked-users'
          }
          onClose={closeModal}
        />

        {/* =====================================
            PERSONAL DETAILS MODAL
        ===================================== */}

        {activeModal ===
          'details' && (
          <div
            className="profile-modal-overlay"
            role="presentation"
            onMouseDown={
              closeModal
            }
          >
            <section
              className="profile-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="details-modal-title"
              onMouseDown={(
                event,
              ) =>
                event.stopPropagation()
              }
            >
              <div className="profile-modal-heading">
                <div>
                  <h2 id="details-modal-title">
                    Edit personal details
                  </h2>

                  <p>
                    Update your name or
                    email address.
                  </p>
                </div>

                <button
                  type="button"
                  className="profile-modal-close"
                  onClick={
                    closeModal
                  }
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {errorMessage && (
                <p
                  className="auth-error"
                  role="alert"
                >
                  {errorMessage}
                </p>
              )}

              <form
                className="profile-modal-form"
                onSubmit={
                  handleProfileSubmit
                }
              >
                <div className="profile-form-row">
                  <div className="profile-form-group">
                    <label htmlFor="profile-first-name">
                      First name
                    </label>

                    <input
                      id="profile-first-name"
                      name="first_name"
                      type="text"
                      value={
                        formData.first_name
                      }
                      onChange={
                        handleChange
                      }
                      required
                    />
                  </div>

                  <div className="profile-form-group">
                    <label htmlFor="profile-last-name">
                      Last name
                    </label>

                    <input
                      id="profile-last-name"
                      name="last_name"
                      type="text"
                      value={
                        formData.last_name
                      }
                      onChange={
                        handleChange
                      }
                      required
                    />
                  </div>
                </div>

                <div className="profile-form-group">
                  <label htmlFor="profile-email">
                    Email address
                  </label>

                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    value={
                      formData.email
                    }
                    onChange={
                      handleChange
                    }
                    required
                  />
                </div>

                <div className="profile-modal-actions">
                  <button
                    type="button"
                    className="profile-secondary-button"
                    onClick={
                      closeModal
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="profile-primary-button"
                    disabled={
                      isSavingProfile
                    }
                  >
                    {isSavingProfile
                      ? 'Saving...'
                      : 'Save changes'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* =====================================
            POSITION MODAL
        ===================================== */}

        {activeModal ===
          'position' && (
          <div
            className="profile-modal-overlay"
            role="presentation"
            onMouseDown={
              closeModal
            }
          >
            <section
              className="profile-modal profile-modal-small"
              role="dialog"
              aria-modal="true"
              aria-labelledby="position-modal-title"
              onMouseDown={(
                event,
              ) =>
                event.stopPropagation()
              }
            >
              <div className="profile-modal-heading">
                <div>
                  <h2 id="position-modal-title">
                    Preferred position
                  </h2>

                  <p>
                    Choose the position
                    you prefer to play.
                  </p>
                </div>

                <button
                  type="button"
                  className="profile-modal-close"
                  onClick={
                    closeModal
                  }
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {errorMessage && (
                <p
                  className="auth-error"
                  role="alert"
                >
                  {errorMessage}
                </p>
              )}

              <form
                className="profile-modal-form"
                onSubmit={
                  handlePreferredPositionSubmit
                }
              >
                <div className="profile-form-group">
                  <label htmlFor="preferred-position">
                    Position
                  </label>

                  <select
                    id="preferred-position"
                    value={
                      preferredPosition
                    }
                    onChange={(
                      event,
                    ) =>
                      setPreferredPosition(
                        event.target
                          .value,
                      )
                    }
                    required
                  >
                    <option
                      value=""
                      disabled
                    >
                      Select a position
                    </option>

                    {POSITIONS.map(
                      (position) => (
                        <option
                          key={
                            position
                          }
                          value={
                            position
                          }
                        >
                          {
                            position
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="profile-modal-actions">
                  <button
                    type="button"
                    className="profile-secondary-button"
                    onClick={
                      closeModal
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="profile-primary-button"
                    disabled={
                      isSavingPosition
                    }
                  >
                    {isSavingPosition
                      ? 'Saving...'
                      : 'Save position'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* =====================================
            PASSWORD MODAL
        ===================================== */}

        {activeModal ===
          'password' && (
          <div
            className="profile-modal-overlay"
            role="presentation"
            onMouseDown={
              closeModal
            }
          >
            <section
              className="profile-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="password-modal-title"
              onMouseDown={(
                event,
              ) =>
                event.stopPropagation()
              }
            >
              <div className="profile-modal-heading">
                <div>
                  <h2 id="password-modal-title">
                    Change password
                  </h2>

                  <p>
                    You will need to log
                    in again after saving.
                  </p>
                </div>

                <button
                  type="button"
                  className="profile-modal-close"
                  onClick={
                    closeModal
                  }
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {errorMessage && (
                <p
                  className="auth-error"
                  role="alert"
                >
                  {errorMessage}
                </p>
              )}

              <form
                className="profile-modal-form"
                onSubmit={
                  handlePasswordSubmit
                }
              >
                <div className="profile-form-group">
                  <label htmlFor="current-password">
                    Current password
                  </label>

                  <input
                    id="current-password"
                    name="current_password"
                    type="password"
                    autoComplete="current-password"
                    value={
                      passwordData.current_password
                    }
                    onChange={
                      handlePasswordChange
                    }
                    required
                  />
                </div>

                <div className="profile-form-group">
                  <label htmlFor="new-password">
                    New password
                  </label>

                  <input
                    id="new-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={
                      passwordData.password
                    }
                    onChange={
                      handlePasswordChange
                    }
                    required
                  />
                </div>

                <div className="profile-form-group">
                  <label htmlFor="password-confirmation">
                    Confirm new password
                  </label>

                  <input
                    id="password-confirmation"
                    name="password_confirmation"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={
                      passwordData.password_confirmation
                    }
                    onChange={
                      handlePasswordChange
                    }
                    required
                  />
                </div>

                <div className="profile-modal-actions">
                  <button
                    type="button"
                    className="profile-secondary-button"
                    onClick={
                      closeModal
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="profile-primary-button"
                    disabled={
                      isChangingPassword
                    }
                  >
                    {isChangingPassword
                      ? 'Changing...'
                      : 'Change password'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {/* =====================================
            DELETE ACCOUNT MODAL
        ===================================== */}

        {activeModal ===
          'delete-account' && (
          <div
            className="profile-modal-overlay"
            role="presentation"
            onMouseDown={
              closeModal
            }
          >
            <section
              className="profile-modal profile-delete-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-modal-title"
              onMouseDown={(
                event,
              ) =>
                event.stopPropagation()
              }
            >
              <div className="profile-modal-heading">
                <div>
                  <span className="profile-danger-label">
                    Permanent action
                  </span>

                  <h2 id="delete-account-modal-title">
                    Delete your account?
                  </h2>

                  <p>
                    This will permanently
                    close your MatchMuster
                    account.
                  </p>
                </div>

                <button
                  type="button"
                  className="profile-modal-close"
                  onClick={
                    closeModal
                  }
                  aria-label="Close"
                  disabled={
                    isDeletingAccount
                  }
                >
                  ×
                </button>
              </div>

              <div className="profile-delete-warning">
                <strong>
                  Before you continue
                </strong>

                <ul>
                  <li>
                    You will immediately
                    lose access to your
                    account.
                  </li>

                  <li>
                    Your active team
                    memberships will be
                    removed.
                  </li>

                  <li>
                    Your profile
                    information and profile
                    picture will be removed
                    where applicable.
                  </li>

                  <li>
                    Some limited payment,
                    legal or security
                    records may be retained
                    where required.
                  </li>
                </ul>
              </div>

              {currentUser?.account_type ===
                'manager' && (
                <p className="profile-delete-manager-note">
                  If you are the only
                  approved manager of a
                  team, MatchMuster will
                  ask you to add another
                  approved manager before
                  the account can be
                  deleted.
                </p>
              )}

              {errorMessage && (
                <p
                  className="auth-error"
                  role="alert"
                >
                  {errorMessage}
                </p>
              )}

              <form
                className="profile-modal-form"
                onSubmit={
                  handleDeleteAccount
                }
              >
                <div className="profile-form-group">
                  <label htmlFor="delete-account-password">
                    Current password
                  </label>

                  <input
                    id="delete-account-password"
                    type="password"
                    autoComplete="current-password"
                    value={
                      deletePassword
                    }
                    onChange={(
                      event,
                    ) =>
                      setDeletePassword(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Enter your password"
                    required
                  />

                  <small>
                    We ask for your
                    password to make sure
                    it is really you.
                  </small>
                </div>

                <label className="profile-delete-confirmation">
                  <input
                    type="checkbox"
                    checked={
                      deleteConfirmed
                    }
                    onChange={(
                      event,
                    ) =>
                      setDeleteConfirmed(
                        event.target
                          .checked,
                      )
                    }
                  />

                  <span>
                    I understand that
                    deleting my
                    MatchMuster account is
                    permanent and cannot
                    be undone.
                  </span>
                </label>

                <div className="profile-modal-actions">
                  <button
                    type="button"
                    className="profile-secondary-button"
                    onClick={
                      closeModal
                    }
                    disabled={
                      isDeletingAccount
                    }
                  >
                    Keep my account
                  </button>

                  <button
                    type="submit"
                    className="profile-delete-confirm-button"
                    disabled={
                      isDeletingAccount ||
                      !deletePassword ||
                      !deleteConfirmed
                    }
                  >
                    {isDeletingAccount
                      ? 'Deleting account...'
                      : 'Delete my account'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </>
  )
}

// ========================================
// RESPONSE HELPERS
// ========================================

async function readResponse(
  response,
) {
  const responseText =
    await response.text()

  return responseText
    ? JSON.parse(responseText)
    : {}
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

function formatLabel(value) {
  if (!value) {
    return 'Not available'
  }

  return value
    .replaceAll('_', ' ')
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    )
}

export default EditProfilePage
