import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Check,
  Crown,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react'

import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'

import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import API_URL from '../config/api'

import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'

import {
  isApplePurchaseCancelled,
  isAppleSubscriptionPlatform,
  loadAppleSubscriptionProducts,
  manageAppleSubscriptions,
  purchaseAppleSubscription,
  restoreAppleSubscription,
} from '../utils/appleSubscriptions'

import './SubscriptionPage.css'
import './SubscriptionPage.mobile.css'

const FEATURE_KEYS = [
  'automatic_availability_reminders',
  'manager_centre',
  'payment_analytics',
  'recurring_training',
  'multi_team_manager_centre',
]

function SubscriptionPage() {
  const navigate =
    useNavigate()

  const location =
    useLocation()

  const { teamId } =
    useParams()

  const [
    subscriptionData,
    setSubscriptionData,
  ] = useState(null)

  const [
    storeProducts,
    setStoreProducts,
  ] = useState([])

  const [loading, setLoading] =
    useState(true)

  const [
    storeLoading,
    setStoreLoading,
  ] = useState(false)

  const [
    purchasingPeriod,
    setPurchasingPeriod,
  ] = useState(null)

  const [
    restoring,
    setRestoring,
  ] = useState(false)

  const [
    managing,
    setManaging,
  ] = useState(false)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('')

  const [
    accessMessage,
    setAccessMessage,
  ] = useState('')

  const [
    introOpen,
    setIntroOpen,
  ] = useState(
    location.state
      ?.showPreviewIntro ===
      true,
  )

  const isAppleNative =
    isAppleSubscriptionPlatform()

  const subscription =
    subscriptionData
      ?.subscription ||
    null

  const launchClub =
    subscription
      ?.launch_club ===
    true

  const appleCatalogue =
    subscriptionData?.products ||
    {}

  const appleProductIds =
    useMemo(() => {
      return [
        appleCatalogue
          ?.monthly?.apple
          ?.product_id,

        appleCatalogue
          ?.annual?.apple
          ?.product_id,
      ].filter(Boolean)
    }, [appleCatalogue])

  const clearSubscriptionSession =
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

  const loadSubscription =
    useCallback(async () => {
      const token =
        getAuthToken()

      if (!token) {
        await clearSubscriptionSession()
        return
      }

      setLoading(true)
      setErrorMessage('')
      setAccessMessage('')

      try {
        const response =
          await fetch(
            `${API_URL}/teams/${teamId}/subscription`,
            {
              headers: {
                Accept:
                  'application/json',

                Authorization:
                  token,
              },
            },
          )

        if (
          response.status ===
          401
        ) {
          await clearSubscriptionSession()
          return
        }

        const data =
          await response
            .json()
            .catch(() => ({}))

        if (
          response.status ===
            403 &&
          data.code ===
            'subscription_primary_team_required' &&
          data.subscription_team
            ?.id
        ) {
          navigate(
            `/teams/${data.subscription_team.id}/subscription`,
            {
              replace: true,
            },
          )

          return
        }

        if (
          response.status ===
          403
        ) {
          setSubscriptionData(null)

          setAccessMessage(
            data.error ||
              'Only the team owner can manage this subscription.',
          )

          return
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Unable to load the subscription.',
          )
        }

        setSubscriptionData(
          data,
        )
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to connect to the server.',
        )
      } finally {
        setLoading(false)
      }
    }, [
      clearSubscriptionSession,
      navigate,
      teamId,
    ])

  useEffect(() => {
    void loadSubscription()
  }, [loadSubscription])

  useEffect(() => {
    let cancelled = false

    async function loadStoreProducts() {
      if (
        !subscriptionData ||
        !isAppleNative ||
        appleProductIds.length ===
          0
      ) {
        setStoreProducts([])
        return
      }

      setStoreLoading(true)

      try {
        const products =
          await loadAppleSubscriptionProducts(
            appleProductIds,
          )

        if (!cancelled) {
          setStoreProducts(
            products,
          )
        }
      } catch (error) {
        if (!cancelled) {
          setStoreProducts([])

          setErrorMessage(
            error.message ||
              'Unable to load App Store plans.',
          )
        }
      } finally {
        if (!cancelled) {
          setStoreLoading(false)
        }
      }
    }

    void loadStoreProducts()

    return () => {
      cancelled = true
    }
  }, [
    appleProductIds,
    isAppleNative,
    subscriptionData,
  ])

  const storeProductById =
    useMemo(() => {
      return storeProducts.reduce(
        (
          products,
          product,
        ) => {
          if (
            product
              ?.productIdentifier
          ) {
            products[
              product.productIdentifier
            ] = product
          }

          return products
        },
        {},
      )
    }, [storeProducts])

  function productIdFor(
    period,
  ) {
    return appleCatalogue
      ?.[period]
      ?.apple
      ?.product_id ||
      null
  }

  function productFor(
    period,
  ) {
    const productId =
      productIdFor(
        period,
      )

    return productId
      ? storeProductById[
          productId
        ] || null
      : null
  }

  function formatDate(value) {
    if (!value) return null

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      },
    ).format(
      new Date(value),
    )
  }

  function statusCopy() {
    if (!subscription) {
      return {
        eyebrow:
          'MatchMuster',
        title:
          'Subscription',
        detail:
          'Plan information is unavailable.',
      }
    }

    if (
      launchClub &&
      subscription.source ===
        'founder' &&
      subscription.plus_active
    ) {
      return {
        eyebrow:
          'Launch Club',
        title:
          'Launch Plus',
        detail:
          subscription.days_remaining
            ? `${subscription.days_remaining} days remaining`
            : 'Complimentary Plus access',
      }
    }

    if (
      subscription.source ===
        'standard_trial' &&
      subscription.plus_active
    ) {
      return {
        eyebrow:
          'MatchMuster Plus',
        title:
          'Plus Preview',
        detail:
          subscription.days_remaining
            ? `${subscription.days_remaining} days remaining · No payment required`
            : '30-day Plus Preview',
      }
    }

    if (
      subscription.status ===
        'grace_period' &&
      subscription.plus_active
    ) {
      return {
        eyebrow:
          launchClub
            ? 'Launch Club'
            : 'MatchMuster Plus',

        title:
          'Billing needs attention',

        detail:
          subscription.ends_at
            ? `Plus remains active until ${formatDate(
                subscription.ends_at,
              )}`
            : 'Plus remains temporarily active',
      }
    }

    if (
      subscription.status ===
        'cancelled' &&
      subscription.plus_active
    ) {
      return {
        eyebrow:
          launchClub
            ? 'Launch Club'
            : 'MatchMuster Plus',

        title:
          'Plus is cancelled',

        detail:
          subscription.ends_at
            ? `Access continues until ${formatDate(
                subscription.ends_at,
              )}`
            : 'Access remains active for now',
      }
    }

    if (
      subscription.plus_active
    ) {
      return {
        eyebrow:
          launchClub
            ? 'Launch Club'
            : 'MatchMuster Plus',

        title:
          launchClub
            ? 'Launch Club · Plus'
            : 'Plus is active',

        detail:
          subscription.billing_period
            ? `${subscription.billing_period[0].toUpperCase()}${subscription.billing_period.slice(
                1,
              )} plan`
            : 'Plus access active',
      }
    }

    if (launchClub) {
      return {
        eyebrow:
          'Launch Club',

        title:
          'Launch Club · Free',

        detail:
          'Your Launch Club status is permanent. Upgrade anytime to restore Plus.',
      }
    }

    return {
      eyebrow:
        'MatchMuster Free',
      title:
        'Free plan',
      detail:
        'Core team management stays available.',
    }
  }

  const currentStatus =
    statusCopy()

  const plusFeatures =
    (
      subscriptionData
        ?.plus_features || []
    ).filter(
      (feature) =>
        FEATURE_KEYS.includes(
          feature.key,
        ),
    )

  const paidThroughAnotherStore =
    subscription
      ?.plus_active &&
    subscription?.provider &&
    subscription.provider !==
      'apple'

  const previewActive =
    subscription?.source ===
      'standard_trial' &&
    subscription?.plus_active

  const launchPlusActive =
    launchClub &&
    subscription?.source ===
      'founder' &&
    subscription?.plus_active

  async function claimAppleTransaction(
    signedTransaction,
    restore = false,
  ) {
    const token =
      getAuthToken()

    if (!token) {
      await clearSubscriptionSession()
      return null
    }

    const endpoint =
      restore
        ? `${API_URL}/teams/${teamId}/subscription/restore`
        : `${API_URL}/teams/${teamId}/subscription/apple/claim`

    const body =
      restore
        ? {
            provider:
              'apple',

            signed_transaction:
              signedTransaction,
          }
        : {
            signed_transaction:
              signedTransaction,
          }

    const response =
      await fetch(
        endpoint,
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
            JSON.stringify(
              body,
            ),
        },
      )

    if (
      response.status ===
      401
    ) {
      await clearSubscriptionSession()
      return null
    }

    const data =
      await response
        .json()
        .catch(() => ({}))

    if (!response.ok) {
      throw new Error(
        data.error ||
          'Apple could not verify this subscription.',
      )
    }

    return data
  }

  async function handlePurchase(
    period,
  ) {
    const productId =
      productIdFor(
        period,
      )

    if (
      !productId ||
      !subscriptionData
        ?.billing_account_token
    ) {
      setErrorMessage(
        'This plan is not ready for purchase.',
      )
      return
    }

    setPurchasingPeriod(
      period,
    )

    setErrorMessage('')
    setSuccessMessage('')

    try {
      const {
        signedTransaction,
      } =
        await purchaseAppleSubscription({
          productIdentifier:
            productId,

          appAccountToken:
            subscriptionData
              .billing_account_token,
        })

      await claimAppleTransaction(
        signedTransaction,
      )

      setSuccessMessage(
        'MatchMuster Plus is now active.',
      )

      await loadSubscription()
    } catch (error) {
      if (
        !isApplePurchaseCancelled(
          error,
        )
      ) {
        setErrorMessage(
          error.message ||
            'Unable to complete the purchase.',
        )
      }
    } finally {
      setPurchasingPeriod(null)
    }
  }

  async function handleRestore() {
    if (
      appleProductIds.length ===
      0
    ) {
      setErrorMessage(
        'No Apple subscription products are configured.',
      )
      return
    }

    setRestoring(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const {
        signedTransaction,
      } =
        await restoreAppleSubscription(
          appleProductIds,
          subscriptionData
            ?.billing_account_token,
        )

      await claimAppleTransaction(
        signedTransaction,
        true,
      )

      setSuccessMessage(
        'Your MatchMuster Plus purchase was restored.',
      )

      await loadSubscription()
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to restore purchases.',
      )
    } finally {
      setRestoring(false)
    }
  }

  async function handleManage() {
    setManaging(true)
    setErrorMessage('')

    try {
      await manageAppleSubscriptions()
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to open Apple subscription management.',
      )
    } finally {
      setManaging(false)
    }
  }

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading subscription...
      </p>
    )
  }

  return (
    <>
      <Navbar
        teamId={teamId}
      />

      <main className="dashboard-page subscription-page">
        <section className="dashboard-content">
          <BackButton />

          {accessMessage ? (
            <article className="subscription-access-card">
              <p className="dashboard-label">
                Subscription
              </p>

              <h1>
                Owner managed
              </h1>

              <p>
                {accessMessage}
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate('/team')
                }
              >
                Back to team
              </button>
            </article>
          ) : (
            <>
              <header className="subscription-hero">
                <div>
                  <p className="dashboard-label">
                    {
                      currentStatus.eyebrow
                    }
                  </p>

                  <h1>
                    {
                      currentStatus.title
                    }
                  </h1>

                  <p>
                    {
                      currentStatus.detail
                    }
                  </p>
                </div>

                <div className="subscription-status-mark">
                  <Crown
                    size={28}
                    aria-hidden="true"
                  />
                </div>
              </header>

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
                  className="subscription-success"
                  role="status"
                >
                  {successMessage}
                </p>
              )}

              <section className="subscription-comparison">
                <article>
                  <p className="dashboard-label">
                    Free
                  </p>

                  <h2>
                    MatchMuster Free
                  </h2>

                  <ul>
                    <li>
                      <Check
                        size={17}
                        aria-hidden="true"
                      />
                      Fixtures and training
                    </li>

                    <li>
                      <Check
                        size={17}
                        aria-hidden="true"
                      />
                      Player availability
                    </li>

                    <li>
                      <Check
                        size={17}
                        aria-hidden="true"
                      />
                      Matchday squad
                    </li>

                    <li>
                      <Check
                        size={17}
                        aria-hidden="true"
                      />
                      Match Subs requests
                    </li>

                    <li>
                      <Check
                        size={17}
                        aria-hidden="true"
                      />
                      MOTM and team awards
                    </li>
                  </ul>
                </article>

                <article className="subscription-plus-card">
                  <p className="dashboard-label">
                    Plus
                  </p>

                  <h2>
                    MatchMuster Plus
                  </h2>

                  <ul>
                    {plusFeatures.map(
                      (feature) => (
                        <li
                          key={
                            feature.key
                          }
                        >
                          <ShieldCheck
                            size={17}
                            aria-hidden="true"
                          />

                          {
                            feature.name
                          }
                        </li>
                      ),
                    )}
                  </ul>
                </article>
              </section>

              <section className="subscription-plans">
                <div className="subscription-section-heading">
                  <div>
                    <p className="dashboard-label">
                      Plans
                    </p>

                    <h2>
                      {previewActive
                        ? 'Keep Plus after your Preview'
                        : launchPlusActive
                          ? 'Keep Plus after Launch Plus'
                          : 'Choose Plus'}
                    </h2>

                    <p>
                      Monthly or annual.
                      Apple shows your
                      local price before
                      purchase.
                    </p>
                  </div>
                </div>

                {paidThroughAnotherStore ? (
                  <article className="subscription-store-note">
                    <strong>
                      Plus is already
                      active.
                    </strong>

                    <span>
                      This subscription
                      is managed through
                      another app store.
                    </span>
                  </article>
                ) : !isAppleNative ? (
                  <article className="subscription-store-note">
                    <strong>
                      iPhone purchase
                    </strong>

                    <span>
                      Open MatchMuster on
                      your iPhone to buy
                      or restore Plus.
                    </span>
                  </article>
                ) : (
                  <div className="subscription-plan-grid">
                    {[
                      'monthly',
                      'annual',
                    ].map(
                      (period) => {
                        const product =
                          productFor(
                            period,
                          )

                        return (
                          <article
                            className={
                              period ===
                              'annual'
                                ? 'subscription-plan-card subscription-plan-card--featured'
                                : 'subscription-plan-card'
                            }
                            key={
                              period
                            }
                          >
                            <span>
                              {period ===
                              'monthly'
                                ? 'Monthly'
                                : 'Annual'}
                            </span>

                            <strong>
                              {storeLoading
                                ? 'Loading...'
                                : product
                                    ?.priceString ||
                                  'Unavailable'}
                            </strong>

                            <small>
                              {period ===
                              'monthly'
                                ? 'Billed monthly'
                                : 'Billed yearly'}
                            </small>

                            <button
                              type="button"
                              disabled={
                                !product ||
                                Boolean(
                                  purchasingPeriod,
                                ) ||
                                restoring
                              }
                              onClick={() =>
                                handlePurchase(
                                  period,
                                )
                              }
                            >
                              {purchasingPeriod ===
                              period
                                ? 'Purchasing...'
                                : subscription
                                      ?.provider_product_id ===
                                    productIdFor(
                                      period,
                                    )
                                  ? 'Current plan'
                                  : `Choose ${
                                      period ===
                                      'monthly'
                                        ? 'monthly'
                                        : 'annual'
                                    }`}
                            </button>
                          </article>
                        )
                      },
                    )}
                  </div>
                )}

                {isAppleNative &&
                  !paidThroughAnotherStore && (
                    <div className="subscription-store-actions">
                      <button
                        type="button"
                        className="subscription-secondary-button"
                        disabled={
                          restoring ||
                          Boolean(
                            purchasingPeriod,
                          )
                        }
                        onClick={
                          handleRestore
                        }
                      >
                        <RefreshCw
                          size={17}
                          aria-hidden="true"
                        />

                        {restoring
                          ? 'Restoring...'
                          : 'Restore purchases'}
                      </button>

                      {subscription
                        ?.provider ===
                        'apple' &&
                        subscription
                          ?.plus_active && (
                          <button
                            type="button"
                            className="subscription-secondary-button"
                            disabled={
                              managing
                            }
                            onClick={
                              handleManage
                            }
                          >
                            {managing
                              ? 'Opening...'
                              : 'Manage with Apple'}
                          </button>
                        )}
                    </div>
                  )}
              </section>

              <div className="subscription-legal-row">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      '/legal/terms',
                    )
                  }
                >
                  Terms of Service
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      '/legal/privacy',
                    )
                  }
                >
                  Privacy Policy
                </button>
              </div>

              <p className="subscription-footnote">
                Players never need a
                MatchMuster subscription.
                Plus is managed by the
                team owner. Apple
                subscriptions renew
                automatically unless
                cancelled through Apple.
              </p>
            </>
          )}
        </section>
      </main>

      {introOpen &&
        subscription && (
          <div className="subscription-intro-overlay">
            <section
              className="subscription-intro-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="subscription-intro-title"
            >
              <button
                type="button"
                className="subscription-intro-close"
                aria-label="Close Plus Preview introduction"
                onClick={() =>
                  setIntroOpen(false)
                }
              >
                <X
                  size={20}
                  aria-hidden="true"
                />
              </button>

              <div className="subscription-intro-icon">
                <Crown
                  size={28}
                  aria-hidden="true"
                />
              </div>

              <p className="dashboard-label">
                MatchMuster Plus
              </p>

              <h2 id="subscription-intro-title">
                Your Plus Preview has started
              </h2>

              <p>
                Enjoy every MatchMuster
                Plus manager feature for
                30 days. No payment is
                required and your team
                moves safely to Free if
                you do not subscribe.
              </p>

              <ul>
                <li>
                  Automatic reminders
                </li>

                <li>
                  Manager insights
                </li>

                <li>
                  Recurring training
                </li>
              </ul>

              <button
                type="button"
                className="subscription-intro-primary"
                onClick={() =>
                  setIntroOpen(false)
                }
              >
                Explore Plus
              </button>

              <button
                type="button"
                className="subscription-intro-secondary"
                onClick={() => {
                  setIntroOpen(false)
                  navigate('/team')
                }}
              >
                Continue to team
              </button>
            </section>
          </div>
        )}
    </>
  )
}

export default SubscriptionPage
