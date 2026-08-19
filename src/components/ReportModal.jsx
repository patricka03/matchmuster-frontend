import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

import './SafetyModals.css'
import './SafetyModals.mobile.css'

const REPORT_REASONS = [
  {
    value: 'spam',
    label:
      'Spam or misleading content',
  },

  {
    value: 'harassment',
    label:
      'Bullying or harassment',
  },

  {
    value: 'hate_speech',
    label: 'Hate speech',
  },

  {
    value: 'violence',
    label:
      'Violence or threats',
  },

  {
    value: 'sexual_content',
    label:
      'Sexual or inappropriate content',
  },

  {
    value: 'impersonation',
    label: 'Impersonation',
  },

  {
    value: 'other',
    label: 'Something else',
  },
]

function ReportModal({
  isOpen,
  onClose,
  reportableType,
  reportableId,
  reportedUserId,
  targetLabel = 'this content',
  onReported,
}) {
  const [reason, setReason] =
    useState('')

  const [details, setDetails] =
    useState('')

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false)

  // ========================================
  // SESSION
  // ========================================

  async function clearReportSession() {
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

    window.location.assign(
      '/login',
    )
  }

  // ========================================
  // CLOSE MODAL
  // ========================================

  const closeModal =
    useCallback(() => {
      setReason('')
      setDetails('')
      setErrorMessage('')

      onClose()
    }, [onClose])

  // ========================================
  // MODAL KEYBOARD / BODY LOCK
  // ========================================

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handleKeyDown(
      event,
    ) {
      if (
        event.key === 'Escape' &&
        !isSubmitting
      ) {
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
  }, [
    closeModal,
    isOpen,
    isSubmitting,
  ])

  if (!isOpen) {
    return null
  }

  // ========================================
  // SUBMIT REPORT
  // ========================================

  async function handleSubmit(
    event,
  ) {
    event.preventDefault()

    if (!reason) {
      setErrorMessage(
        'Please choose a reason for the report.',
      )

      return
    }

    const token =
      getAuthToken()

    if (!token) {
      setErrorMessage(
        'Please sign in again before sending a report.',
      )

      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const response =
        await fetch(
          `${API_URL}/reports`,
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
                report: {
                  reportable_type:
                    reportableType,

                  reportable_id:
                    reportableId,

                  reported_user_id:
                    reportedUserId,

                  reason,

                  details:
                    details.trim(),
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
        await clearReportSession()

        return
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Unable to send this report.',
          ),
        )
      }

      onReported?.(data)

      closeModal()
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to send this report.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div
      className="safety-modal-overlay"
      role="presentation"
      onMouseDown={() => {
        if (!isSubmitting) {
          closeModal()
        }
      }}
    >
      <section
        className="safety-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header className="safety-modal-heading">
          <div>
            <p className="safety-modal-label">
              Safety report
            </p>

            <h2 id="report-modal-title">
              Report {targetLabel}
            </h2>

            <p>
              Your report is private
              and will be reviewed by
              the MatchMuster
              moderation team.
            </p>
          </div>

          <button
            className="safety-modal-close"
            type="button"
            onClick={
              closeModal
            }
            disabled={
              isSubmitting
            }
            aria-label="Close report form"
          >
            ×
          </button>
        </header>

        {errorMessage && (
          <p
            className="safety-modal-error"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        <form
          className="safety-modal-form"
          onSubmit={
            handleSubmit
          }
        >
          <label htmlFor="report-reason">
            Reason

            <select
              id="report-reason"
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value,
                )
              }
              disabled={
                isSubmitting
              }
              required
            >
              <option value="">
                Choose a reason
              </option>

              {REPORT_REASONS.map(
                (
                  reportReason,
                ) => (
                  <option
                    key={
                      reportReason.value
                    }
                    value={
                      reportReason.value
                    }
                  >
                    {
                      reportReason.label
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <label htmlFor="report-details">
            Tell us what happened

            <textarea
              id="report-details"
              value={details}
              onChange={(event) =>
                setDetails(
                  event.target.value,
                )
              }
              maxLength={1000}
              rows="5"
              placeholder="Add any details that will help us review the report."
              disabled={
                isSubmitting
              }
            />

            <small>
              {details.length}/1000
              characters
            </small>
          </label>

          <div className="safety-modal-actions">
            <button
              className="safety-secondary-button"
              type="button"
              onClick={
                closeModal
              }
              disabled={
                isSubmitting
              }
            >
              Cancel
            </button>

            <button
              className="safety-danger-button"
              type="submit"
              disabled={
                isSubmitting ||
                !reason
              }
            >
              {isSubmitting
                ? 'Sending report…'
                : 'Send report'}
            </button>
          </div>
        </form>
      </section>
    </div>
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

export default ReportModal
