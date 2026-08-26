import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import Navbar from '../components/Navbar'

import './MatchPaymentsPage.css'
import './MatchPaymentsPage.mobile.css'

import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

function MatchPaymentsPage() {
  const navigate =
    useNavigate()

  const {
    teamId,
    matchId,
  } = useParams()

  const [match, setMatch] =
    useState(null)

  const [payments, setPayments] =
    useState([])

  const [summary, setSummary] =
    useState(null)

  const [
    isManager,
    setIsManager,
  ] = useState(false)

  const [amount, setAmount] =
    useState('')

  const [
    activeFilter,
    setActiveFilter,
  ] = useState('all')

  const [loading, setLoading] =
    useState(true)

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const [
    processingId,
    setProcessingId,
  ] = useState(null)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('')

  const apiBase =
    `${API_URL}/teams/${teamId}/matches/${matchId}`

  // ========================================
  // SESSION
  // ========================================

  const redirectToLogin =
    useCallback(async () => {
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
    }, [navigate])

  const handleUnauthorised =
    useCallback(
      async (response) => {
        if (
          response.status !==
          401
        ) {
          return false
        }

        await redirectToLogin()

        return true
      },
      [redirectToLogin],
    )

  // ========================================
  // LOAD PAYMENT DATA
  // ========================================

  const loadPaymentData =
    useCallback(async () => {
      const token =
        getAuthToken()

      if (!token) {
        await redirectToLogin()

        return
      }

      const headers = {
        Accept:
          'application/json',

        Authorization:
          token,
      }

      try {
        const [
          matchResponse,
          paymentsResponse,
          summaryResponse,
        ] = await Promise.all([
          fetch(
            apiBase,
            {
              headers,
            },
          ),

          fetch(
            `${apiBase}/match_payments`,
            {
              headers,
            },
          ),

          fetch(
            `${apiBase}/match_payments/summary`,
            {
              headers,
            },
          ),
        ])

        if (
          (await handleUnauthorised(
            matchResponse,
          )) ||
          (await handleUnauthorised(
            paymentsResponse,
          )) ||
          (await handleUnauthorised(
            summaryResponse,
          ))
        ) {
          return
        }

        const matchData =
          await matchResponse.json()

        const paymentsData =
          await paymentsResponse.json()

        if (!matchResponse.ok) {
          setErrorMessage(
            matchData.error ||
              'Unable to load the fixture.',
          )

          return
        }

        if (
          !paymentsResponse.ok
        ) {
          setErrorMessage(
            paymentsData.error ||
              'Unable to load match payments.',
          )

          return
        }

        setMatch(
          matchData,
        )

        setPayments(
          Array.isArray(
            paymentsData,
          )
            ? paymentsData
            : paymentsData.match_payments ||
                [],
        )

        if (
          summaryResponse.ok
        ) {
          const summaryData =
            await summaryResponse.json()

          setSummary(
            summaryData,
          )

          setIsManager(
            true,
          )
        } else {
          setSummary(null)
          setIsManager(false)
        }
      } catch {
        setErrorMessage(
          'Unable to connect to the server.',
        )
      } finally {
        setLoading(false)
      }
    }, [
      apiBase,
      handleUnauthorised,
      redirectToLogin,
    ])

  useEffect(() => {
    loadPaymentData()
  }, [loadPaymentData])

  function formatMoney(
    amountPence,
  ) {
    return new Intl.NumberFormat(
      'en-GB',
      {
        style:
          'currency',

        currency:
          'GBP',
      },
    ).format(
      (amountPence || 0) /
        100,
    )
  }

  function playerName(
    payment,
  ) {
    const firstName =
      payment.user
        ?.first_name ||
      ''

    const lastName =
      payment.user
        ?.last_name ||
      ''

    const fullName =
      `${firstName} ${lastName}`.trim()

    return (
      fullName ||
      payment.user?.name ||
      payment.user_name ||
      'Unknown player'
    )
  }

  function displayStatus(
    status,
  ) {
    if (status === 'paid') {
      return 'Paid'
    }

    if (
      status === 'waived'
    ) {
      return 'Waived'
    }

    if (
      status === 'refunded'
    ) {
      return 'Refunded'
    }

    return 'Pending'
  }

  const paymentCounts =
    useMemo(() => {
      return payments.reduce(
        (
          counts,
          payment,
        ) => {
          counts.all += 1

          if (
            counts[
              payment.status
            ] !== undefined
          ) {
            counts[
              payment.status
            ] += 1
          }

          return counts
        },
        {
          all: 0,
          pending: 0,
          paid: 0,
          waived: 0,
          refunded: 0,
        },
      )
    }, [payments])

  const filteredPayments =
    useMemo(() => {
      const statusPriority = {
        pending: 0,
        paid: 1,
        waived: 2,
        refunded: 3,
      }

      return payments
        .filter(
          (payment) =>
            activeFilter ===
              'all' ||
            payment.status ===
              activeFilter,
        )
        .sort(
          (
            firstPayment,
            secondPayment,
          ) => {
            const firstPriority =
              statusPriority[
                firstPayment
                  .status
              ] ?? 99

            const secondPriority =
              statusPriority[
                secondPayment
                  .status
              ] ?? 99

            if (
              firstPriority !==
              secondPriority
            ) {
              return (
                firstPriority -
                secondPriority
              )
            }

            return playerName(
              firstPayment,
            ).localeCompare(
              playerName(
                secondPayment,
              ),
            )
          },
        )
    }, [
      payments,
      activeFilter,
    ])

  const totalChargedPence =
    summary?.total_requested_pence ||
    0

  const totalCollectedPence =
    summary?.total_paid_pence ||
    0

  const collectionPercentage =
    totalChargedPence > 0
      ? Math.min(
          100,
          Math.round(
            (totalCollectedPence /
              totalChargedPence) *
              100,
          ),
        )
      : 0

  const requestAmountPence =
    amount
      ? Math.round(
          Number(amount) *
            100,
        )
      : 0

  // ========================================
  // BULK REQUEST
  // ========================================

  async function handleBulkRequest(
    event,
  ) {
    event.preventDefault()

    const amountNumber =
      Number(amount)

    if (
      !amount ||
      amountNumber <= 0
    ) {
      setErrorMessage(
        'Enter a valid payment amount.',
      )

      return
    }

    const amountPence =
      Math.round(
        amountNumber *
          100,
      )

    const token =
      getAuthToken()

    if (!token) {
      await redirectToLogin()

      return
    }

    setSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response =
        await fetch(
          `${apiBase}/match_payments/bulk_create`,
          {
            method:
              'POST',

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
                match_payment: {
                  amount_pence:
                    amountPence,
                },
              }),
          },
        )

      if (
        await handleUnauthorised(
          response,
        )
      ) {
        return
      }

      const data =
        await response.json()

      if (!response.ok) {
        setErrorMessage(
          data.errors?.join(
            ', ',
          ) ||
            data.error ||
            'Unable to request match payments.',
        )

        return
      }

      const createdCount =
        data.created_count ||
        0

      const skippedCount =
        data.skipped_count ||
        0

      if (
        createdCount ===
          0 &&
        skippedCount > 0
      ) {
        setSuccessMessage(
          `No new requests were needed. ${skippedCount} ` +
            `selected player(s) already had a payment request.`,
        )
      } else {
        setSuccessMessage(
          `${createdCount} payment request(s) sent successfully. ` +
            `${skippedCount} existing request(s) were skipped.`,
        )
      }

      setAmount('')
      setActiveFilter(
        'all',
      )

      await loadPaymentData()
    } catch {
      setErrorMessage(
        'Unable to connect to the server.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ========================================
  // STATUS
  // ========================================

  async function handleStatusChange(
    payment,
    status,
  ) {
    if (
      status === 'waived'
    ) {
      const confirmed =
        window.confirm(
          `Waive the ${formatMoney(
            payment.amount_pence,
          )} payment for ${playerName(
            payment,
          )}?`,
        )

      if (!confirmed) {
        return
      }
    }

    const token =
      getAuthToken()

    if (!token) {
      await redirectToLogin()

      return
    }

    setProcessingId(
      payment.id,
    )

    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response =
        await fetch(
          `${apiBase}/match_payments/${payment.id}`,
          {
            method:
              'PATCH',

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
                match_payment: {
                  status,
                },
              }),
          },
        )

      if (
        await handleUnauthorised(
          response,
        )
      ) {
        return
      }

      const data =
        await response.json()

      if (!response.ok) {
        setErrorMessage(
          data.errors?.join(
            ', ',
          ) ||
            data.error ||
            'Unable to update the payment.',
        )

        return
      }

      if (
        status === 'paid'
      ) {
        setSuccessMessage(
          `${playerName(
            payment,
          )} was marked as paid manually.`,
        )
      } else if (
        status === 'waived'
      ) {
        setSuccessMessage(
          `${playerName(
            payment,
          )}’s payment was waived.`,
        )
      } else if (
        status === 'pending'
      ) {
        setSuccessMessage(
          `${playerName(
            payment,
          )}’s payment was reset to pending.`,
        )
      } else {
        setSuccessMessage(
          `${playerName(
            payment,
          )}’s payment was updated.`,
        )
      }

      await loadPaymentData()
    } catch {
      setErrorMessage(
        'Unable to connect to the server.',
      )
    } finally {
      setProcessingId(null)
    }
  }

  // ========================================
  // AMOUNT
  // ========================================

  async function handleAmountChange(
    payment,
  ) {
    const newAmount =
      window.prompt(
        `Enter the new amount for ${playerName(
          payment,
        )}:`,
        (
          payment.amount_pence /
          100
        ).toFixed(2),
      )

    if (
      newAmount === null
    ) {
      return
    }

    const amountNumber =
      Number(newAmount)

    if (
      !newAmount ||
      amountNumber <= 0
    ) {
      setErrorMessage(
        'Enter a valid payment amount.',
      )

      return
    }

    const token =
      getAuthToken()

    if (!token) {
      await redirectToLogin()

      return
    }

    setProcessingId(
      payment.id,
    )

    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response =
        await fetch(
          `${apiBase}/match_payments/${payment.id}`,
          {
            method:
              'PATCH',

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
                match_payment: {
                  amount_pence:
                    Math.round(
                      amountNumber *
                        100,
                    ),
                },
              }),
          },
        )

      if (
        await handleUnauthorised(
          response,
        )
      ) {
        return
      }

      const data =
        await response.json()

      if (!response.ok) {
        setErrorMessage(
          data.errors?.join(
            ', ',
          ) ||
            data.error ||
            'Unable to update the amount.',
        )

        return
      }

      setSuccessMessage(
        `${playerName(
          payment,
        )}’s payment was changed to ${formatMoney(
          Math.round(
            amountNumber *
              100,
          ),
        )}.`,
      )

      await loadPaymentData()
    } catch {
      setErrorMessage(
        'Unable to connect to the server.',
      )
    } finally {
      setProcessingId(null)
    }
  }

  // ========================================
  // DELETE
  // ========================================

  async function handleDelete(
    payment,
  ) {
    const confirmed =
      window.confirm(
        `Remove the ${formatMoney(
          payment.amount_pence,
        )} payment request for ${playerName(
          payment,
        )}?`,
      )

    if (!confirmed) {
      return
    }

    const token =
      getAuthToken()

    if (!token) {
      await redirectToLogin()

      return
    }

    setProcessingId(
      payment.id,
    )

    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response =
        await fetch(
          `${apiBase}/match_payments/${payment.id}`,
          {
            method:
              'DELETE',

            headers: {
              Accept:
                'application/json',

              Authorization:
                token,
            },
          },
        )

      if (
        await handleUnauthorised(
          response,
        )
      ) {
        return
      }

      if (!response.ok) {
        let message =
          'Unable to remove the payment request.'

        try {
          const data =
            await response.json()

          message =
            data.error ||
            message
        } catch {
          // Rails may return an empty response.
        }

        setErrorMessage(
          message,
        )

        return
      }

      setSuccessMessage(
        `${playerName(
          payment,
        )}’s payment request was removed.`,
      )

      await loadPaymentData()
    } catch {
      setErrorMessage(
        'Unable to connect to the server.',
      )
    } finally {
      setProcessingId(null)
    }
  }

  // ========================================
  // STRIPE CHECKOUT
  // ========================================

  async function handleCheckout(
    payment,
  ) {
    const token =
      getAuthToken()

    if (!token) {
      await redirectToLogin()

      return
    }

    setProcessingId(
      payment.id,
    )

    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response =
        await fetch(
          `${apiBase}/match_payments/${payment.id}/checkout`,
          {
            method:
              'POST',

            headers: {
              Accept:
                'application/json',

              Authorization:
                token,
            },
          },
        )

      if (
        await handleUnauthorised(
          response,
        )
      ) {
        return
      }

      const data =
        await response.json()

      if (!response.ok) {
        setErrorMessage(
          data.error ||
            'Unable to start Stripe Checkout.',
        )

        return
      }

      if (
        !data.checkout_url
      ) {
        setErrorMessage(
          'Stripe did not return a checkout link.',
        )

        return
      }

      window.location.href =
        data.checkout_url
    } catch {
      setErrorMessage(
        'Unable to connect to the server.',
      )
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading match payments...
      </p>
    )
  }

  return (
    <>
      <Navbar />

      <main className="dashboard-page">
        <section className="dashboard-content">
          {match && (
            <div className="dashboard-welcome payment-page-heading">
              <p className="dashboard-label">
                Match finances
              </p>

              <h1>
                Match payments
              </h1>

              <p>
                {isManager
                  ? 'Request, collect and track player fees'
                  : 'View and pay your match fee'}{' '}
                for the fixture against{' '}
                <strong>
                  {match.opponent}
                </strong>
                .
              </p>
            </div>
          )}

          {errorMessage && (
            <p
              className="team-error"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p
              className="payment-success-message"
              role="status"
            >
              {successMessage}
            </p>
          )}

          {isManager &&
            summary && (
              <section className="payment-finance-overview">
                <div className="payment-collection-card">
                  <div className="payment-collection-heading">
                    <div>
                      <p className="dashboard-label">
                        Collection
                        progress
                      </p>

                      <h2>
                        {formatMoney(
                          totalCollectedPence,
                        )}{' '}
                        of{' '}
                        {formatMoney(
                          totalChargedPence,
                        )}{' '}
                        collected
                      </h2>
                    </div>

                    <strong className="collection-percentage">
                      {
                        collectionPercentage
                      }
                      %
                    </strong>
                  </div>

                  <div
                    className="collection-progress-track"
                    role="progressbar"
                    aria-label="Payment collection progress"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={
                      collectionPercentage
                    }
                  >
                    <span
                      className="collection-progress-fill"
                      style={{
                        width: `${collectionPercentage}%`,
                      }}
                    />
                  </div>

                  <p className="collection-progress-caption">
                    {
                      paymentCounts.paid
                    }{' '}
                    paid ·{' '}
                    {
                      paymentCounts.pending
                    }{' '}
                    outstanding
                  </p>
                </div>

                <section className="payment-summary">
                  <article>
                    <span>
                      Total charged
                    </span>

                    <strong>
                      {formatMoney(
                        summary.total_requested_pence,
                      )}
                    </strong>
                  </article>

                  <article className="payment-summary-collected">
                    <span>
                      Collected
                    </span>

                    <strong>
                      {formatMoney(
                        summary.total_paid_pence,
                      )}
                    </strong>
                  </article>

                  <article className="payment-summary-outstanding">
                    <span>
                      Outstanding
                    </span>

                    <strong>
                      {formatMoney(
                        summary.total_pending_pence,
                      )}
                    </strong>
                  </article>

                  <article>
                    <span>
                      Waived
                    </span>

                    <strong>
                      {formatMoney(
                        summary.total_waived_pence,
                      )}
                    </strong>
                  </article>
                </section>
              </section>
            )}

          {isManager && (
            <form
              className="payment-request-form"
              onSubmit={
                handleBulkRequest
              }
            >
              <div className="payment-request-copy">
                <p className="dashboard-label">
                  New payment request
                </p>

                <h2>
                  Charge the selected
                  squad
                </h2>

                <p>
                  A request will be
                  created for every
                  selected player who
                  does not already have
                  one.
                </p>

                {requestAmountPence >
                  0 && (
                  <p className="payment-request-preview">
                    Requesting{' '}
                    <strong>
                      {formatMoney(
                        requestAmountPence,
                      )}
                    </strong>{' '}
                    from each eligible
                    selected player.
                  </p>
                )}
              </div>

              <div className="payment-request-controls">
                <label htmlFor="match-payment-amount">
                  Amount per player
                </label>

                <div className="payment-amount-input">
                  <span aria-hidden="true">
                    £
                  </span>

                  <input
                    id="match-payment-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={
                      amount
                    }
                    onChange={(
                      event,
                    ) =>
                      setAmount(
                        event.target
                          .value,
                      )
                    }
                    placeholder="10.00"
                    disabled={
                      submitting
                    }
                    required
                  />
                </div>

                <button
                  className="request-payments-button"
                  type="submit"
                  disabled={
                    submitting
                  }
                >
                  {submitting
                    ? 'Sending requests...'
                    : 'Request payments'}
                </button>
              </div>
            </form>
          )}

          {payments.length >
            0 && (
            <section className="payment-list-section">
              <div className="payment-list-heading">
                <div>
                  <p className="dashboard-label">
                    {isManager
                      ? 'Player payments'
                      : 'Your payment'}
                  </p>

                  <h2>
                    {isManager
                      ? 'Payment requests'
                      : 'Match fee'}
                  </h2>
                </div>

                {isManager &&
                  paymentCounts.pending >
                    0 && (
                    <span className="outstanding-payment-count">
                      {
                        paymentCounts.pending
                      }{' '}
                      outstanding
                    </span>
                  )}
              </div>

              <div
                className="payment-filter-tabs"
                role="group"
                aria-label="Filter payment requests"
              >
                {[
                  {
                    key: 'all',
                    label:
                      'All',
                  },
                  {
                    key:
                      'pending',
                    label:
                      'Pending',
                  },
                  {
                    key: 'paid',
                    label:
                      'Paid',
                  },
                  {
                    key:
                      'waived',
                    label:
                      'Waived',
                  },
                ].map(
                  (filter) => (
                    <button
                      className={
                        activeFilter ===
                        filter.key
                          ? 'active'
                          : ''
                      }
                      type="button"
                      key={
                        filter.key
                      }
                      onClick={() =>
                        setActiveFilter(
                          filter.key,
                        )
                      }
                      aria-pressed={
                        activeFilter ===
                        filter.key
                      }
                    >
                      {
                        filter.label
                      }

                      <span>
                        {
                          paymentCounts[
                            filter
                              .key
                          ]
                        }
                      </span>
                    </button>
                  ),
                )}
              </div>
            </section>
          )}

          {payments.length ===
          0 ? (
            <article className="empty-team-card">
              <div className="card-icon">
                💳
              </div>

              <h2>
                No payment requests
              </h2>

              <p>
                {isManager
                  ? 'Request payments from your selected squad.'
                  : 'You do not have a payment request for this match.'}
              </p>
            </article>
          ) : filteredPayments.length ===
            0 ? (
            <article className="empty-team-card">
              <div className="card-icon">
                ✓
              </div>

              <h2>
                No{' '}
                {displayStatus(
                  activeFilter,
                ).toLowerCase()}{' '}
                payments
              </h2>

              <p>
                There are currently
                no payments matching
                this filter.
              </p>

              <button
                className="clear-payment-filter-button"
                type="button"
                onClick={() =>
                  setActiveFilter(
                    'all',
                  )
                }
              >
                View all payments
              </button>
            </article>
          ) : (
            <section className="match-payment-list">
              {filteredPayments.map(
                (payment) => {
                  const processing =
                    processingId ===
                    payment.id

                  return (
                    <article
                      className={`match-payment-card payment-card-${payment.status}`}
                      key={
                        payment.id
                      }
                    >
                      <div className="match-payment-player">
                        <div
                          className="match-payment-player-avatar"
                          aria-hidden="true"
                        >
                          {playerName(
                            payment,
                          )
                            .charAt(
                              0,
                            )
                            .toUpperCase()}
                        </div>

                        <div className="payment-player-information">
                          <h2>
                            {playerName(
                              payment,
                            )}
                          </h2>

                          <p>
                            Match fee:{' '}
                            <strong>
                              {formatMoney(
                                payment.amount_pence,
                              )}
                            </strong>
                          </p>

                          {payment.paid_at && (
                            <small>
                              Paid on{' '}
                              {new Date(
                                payment.paid_at,
                              ).toLocaleString(
                                'en-GB',
                                {
                                  day: 'numeric',
                                  month:
                                    'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute:
                                    '2-digit',
                                },
                              )}
                            </small>
                          )}
                        </div>
                      </div>

                      <div className="match-payment-status-area">
                        <span
                          className={`payment-status ${payment.status}`}
                        >
                          {displayStatus(
                            payment.status,
                          )}
                        </span>

                        {isManager ? (
                          <div className="match-payment-actions">
                            {payment.status ===
                              'pending' && (
                              <>
                                <button
                                  className="edit-payment-button"
                                  type="button"
                                  onClick={() =>
                                    handleAmountChange(
                                      payment,
                                    )
                                  }
                                  disabled={
                                    processing
                                  }
                                >
                                  Edit
                                  amount
                                </button>

                                <button
                                  className="mark-paid-button"
                                  type="button"
                                  onClick={() =>
                                    handleStatusChange(
                                      payment,
                                      'paid',
                                    )
                                  }
                                  disabled={
                                    processing
                                  }
                                >
                                  Mark
                                  paid
                                  manually
                                </button>

                                <button
                                  className="waive-payment-button"
                                  type="button"
                                  onClick={() =>
                                    handleStatusChange(
                                      payment,
                                      'waived',
                                    )
                                  }
                                  disabled={
                                    processing
                                  }
                                >
                                  Waive
                                  fee
                                </button>
                              </>
                            )}

                            {payment.status !==
                              'pending' && (
                              <button
                                className="reset-payment-button"
                                type="button"
                                onClick={() =>
                                  handleStatusChange(
                                    payment,
                                    'pending',
                                  )
                                }
                                disabled={
                                  processing
                                }
                              >
                                Reset
                                to
                                pending
                              </button>
                            )}

                            <button
                              className="delete-payment-button"
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  payment,
                                )
                              }
                              disabled={
                                processing
                              }
                            >
                              {processing
                                ? 'Processing...'
                                : 'Remove request'}
                            </button>
                          </div>
                        ) : (
                          payment.status ===
                            'pending' && (
                            <button
                              className="pay-now-button"
                              type="button"
                              onClick={() =>
                                handleCheckout(
                                  payment,
                                )
                              }
                              disabled={
                                processing
                              }
                            >
                              {processing
                                ? 'Opening checkout...'
                                : `Pay ${formatMoney(
                                    payment.amount_pence,
                                  )}`}
                            </button>
                          )
                        )}
                      </div>
                    </article>
                  )
                },
              )}
            </section>
          )}
        </section>
      </main>
    </>
  )
}

export default MatchPaymentsPage
