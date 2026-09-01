import { useCallback, useEffect, useMemo, useState } from 'react'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  LockKeyhole,
  MessageCircle,
  Receipt,
  Save,
  Search,
  ShieldAlert,
  WalletCards,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import Navbar from '../components/Navbar'
import API_URL from '../config/api'
import { clearAuthToken, getAuthToken } from '../utils/authStorage'
import './TeamPaymentsPage.css'

const FALLBACK_TYPES = {
  match_sub: 'Match Subs',
  training_sub: 'Training Subs',
  yellow_card_fine: 'Yellow-card fine',
  second_yellow_fine: 'Second-yellow fine',
  red_card_fine: 'Red-card fine',
  disciplinary_fine: 'Disciplinary fine',
  membership_fee: 'Membership fee',
  kit_payment: 'Kit payment',
  tournament_fee: 'Tournament fee',
  transport_contribution: 'Transport contribution',
  social_event: 'Social event',
  other: 'Other team payment',
}

const FINE_TYPES = [
  'yellow_card_fine',
  'second_yellow_fine',
  'red_card_fine',
  'disciplinary_fine',
]

const CARD_TYPE_FOR_PAYMENT = {
  yellow_card_fine: 'yellow',
  second_yellow_fine: 'second_yellow',
  red_card_fine: 'straight_red',
  disciplinary_fine: 'other',
}

function currency(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(Number(value || 0) / 100)
}

function fullName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Player'
}

function displayDate(value, includeTime = false) {
  if (!value) return 'No deadline'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

function statusLabel(payment) {
  if (payment.overdue) return 'Overdue'
  return {
    pending: 'Awaiting payment',
    cash_pending: 'Cash awaiting confirmation',
    partially_paid: 'Partially paid',
    paid: 'Paid',
    waived: 'Waived',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  }[payment.status] || payment.status
}

function defaultDueDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().slice(0, 10)
}

function TeamPaymentsPage() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const checkoutResult = new URLSearchParams(window.location.search).get('payment')

  const [currentUser, setCurrentUser] = useState(null)
  const [team, setTeam] = useState(null)
  const [isManager, setIsManager] = useState(false)
  const [payments, setPayments] = useState([])
  const [discipline, setDiscipline] = useState([])
  const [templates, setTemplates] = useState([])
  const [context, setContext] = useState({ players: [], matches: [], payment_types: FALLBACK_TYPES, plus: {} })
  const [summary, setSummary] = useState(null)
  const [pageLocked, setPageLocked] = useState(false)
  const [analyticsLocked, setAnalyticsLocked] = useState(false)
  const [activeView, setActiveView] = useState('payments')
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(checkoutResult === 'success' ? 'Your payment was received. The status will update shortly.' : '')
  const [checkoutNotice] = useState(checkoutResult === 'cancelled' ? 'Payment was cancelled. Nothing was charged.' : '')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [form, setForm] = useState({
    payment_type: 'match_sub',
    title: 'Match Subs',
    description: '',
    amount: '',
    due_at: defaultDueDate(),
    match_id: '',
    recipient_scope: 'selected_squad',
    user_ids: [],
    incident_minute: '',
    suspension_matches: '0',
    appeal_status: 'not_applicable',
    evidence_url: '',
    issue_fine: true,
  })
  const [templateForm, setTemplateForm] = useState({
    name: '',
    recurrence: 'none',
    next_run_on: '',
  })

  const redirectToLogin = useCallback(async () => {
    await clearAuthToken()
    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')
    navigate('/login', { replace: true })
  }, [navigate])

  const request = useCallback(async (path, options = {}) => {
    const token = getAuthToken()
    if (!token) {
      await redirectToLogin()
      throw new Error('Your session has expired.')
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        Authorization: token,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })

    if (response.status === 401) {
      await redirectToLogin()
      throw new Error('Your session has expired.')
    }

    const data = response.status === 204 ? {} : await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = data.errors?.join(', ') || data.error || 'The request could not be completed.'
      const requestError = new Error(message)
      requestError.status = response.status
      requestError.code = data.code
      throw requestError
    }
    return data
  }, [redirectToLogin])

  const loadPage = useCallback(async () => {
    setLoading(true)
    setError('')
    setPageLocked(false)

    try {
      const [userData, teamData] = await Promise.all([
        request('/users/me'),
        request(`/teams/${teamId}`),
      ])

      const user = userData.user || userData
      const currentTeam = teamData.team || teamData
      const manager = user.account_type === 'manager' &&
        user.manager_verification_status === 'approved' &&
        currentTeam.membership_role === 'manager'

      setCurrentUser(user)
      setTeam(currentTeam)
      setIsManager(manager)

      let paymentData
      let disciplineData
      try {
        ;[paymentData, disciplineData] = await Promise.all([
          request(`/teams/${teamId}/payments`),
          request(`/teams/${teamId}/disciplinary_records`),
        ])
      } catch (paymentError) {
        if (manager && paymentError.code === 'plus_required') {
          setPageLocked(true)
          setPayments([])
          setDiscipline([])
          return
        }
        throw paymentError
      }

      setPayments(paymentData.payments || [])
      setDiscipline(disciplineData.disciplinary_records || [])

      if (manager) {
        const contextData = await request(`/teams/${teamId}/payments/context`)
        setContext(contextData)

        const [summaryResult, templateResult] = await Promise.allSettled([
          request(`/teams/${teamId}/payments/summary`),
          request(`/teams/${teamId}/payment_templates`),
        ])

        if (summaryResult.status === 'fulfilled') {
          setSummary(summaryResult.value)
          setAnalyticsLocked(false)
        } else {
          setSummary(null)
          setAnalyticsLocked(summaryResult.reason.code === 'plus_required')
        }

        if (templateResult.status === 'fulfilled') {
          setTemplates(templateResult.value.templates || [])
        } else {
          setTemplates([])
        }
      }
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [request, teamId])

  useEffect(() => {
    // The page loader synchronises the screen with the authenticated API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage()
  }, [loadPage])

  useEffect(() => {
    if (!checkoutResult) return
    const cleanUrl = `${window.location.pathname}${window.location.hash}`
    window.history.replaceState(window.history.state, '', cleanUrl)
  }, [checkoutResult])

  const paymentTypes = context.payment_types || FALLBACK_TYPES
  const isFine = FINE_TYPES.includes(form.payment_type)
  const matchRequired = form.payment_type === 'match_sub' || isFine

  const filteredPayments = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return payments.filter((payment) => {
      const searchable = [
        payment.title,
        payment.type_label,
        fullName(payment.user),
        payment.match?.opponent,
        statusLabel(payment),
        currency(payment.amount_pence),
      ].filter(Boolean).join(' ').toLowerCase()

      return (!needle || searchable.includes(needle)) &&
        (statusFilter === 'all' || (statusFilter === 'overdue' ? payment.overdue : payment.status === statusFilter)) &&
        (typeFilter === 'all' || payment.payment_type === typeFilter)
    })
  }, [payments, query, statusFilter, typeFilter])

  const playerBalances = useMemo(() => {
    return payments.reduce((result, payment) => {
      if (!['pending', 'cash_pending', 'partially_paid'].includes(payment.status)) return result
      const name = fullName(payment.user)
      result[name] = (result[name] || 0) + Number(payment.amount_outstanding_pence || 0)
      return result
    }, {})
  }, [payments])

  function resetMessages() {
    setError('')
    setSuccess('')
  }

  function changeType(value) {
    setForm((current) => ({
      ...current,
      payment_type: value,
      title: paymentTypes[value] || FALLBACK_TYPES[value] || 'Team payment',
      recipient_scope: FINE_TYPES.includes(value) ? 'selected' : value === 'match_sub' ? 'selected_squad' : 'all_players',
      user_ids: FINE_TYPES.includes(value) ? current.user_ids.slice(0, 1) : current.user_ids,
    }))
  }

  async function submitPayment(event) {
    event.preventDefault()
    resetMessages()

    const amountPence = Math.round(Number(form.amount) * 100)
    if ((!isFine || form.issue_fine) && (!amountPence || amountPence < 1)) {
      setError('Enter a valid payment amount.')
      return
    }
    if (matchRequired && !form.match_id) {
      setError('Select the relevant match.')
      return
    }
    if (form.recipient_scope === 'selected' && form.user_ids.length === 0) {
      setError('Select at least one player.')
      return
    }

    setProcessing('create')
    try {
      if (isFine) {
        await request(`/teams/${teamId}/disciplinary_records`, {
          method: 'POST',
          body: JSON.stringify({
            disciplinary_record: {
              match_id: form.match_id,
              player_id: form.user_ids[0],
              card_type: CARD_TYPE_FOR_PAYMENT[form.payment_type],
              incident_minute: form.incident_minute || null,
              reason: form.description,
              suspension_matches: Number(form.suspension_matches || 0),
              appeal_status: form.appeal_status,
              evidence_url: form.evidence_url || null,
              fine_amount_pence: form.issue_fine ? amountPence : null,
              fine_title: form.title,
              fine_due_at: form.due_at || null,
            },
          }),
        })
        setSuccess(form.issue_fine ? 'The card and player fine were recorded successfully.' : 'The disciplinary record was saved without a fine.')
      } else {
        const data = await request(`/teams/${teamId}/payments`, {
          method: 'POST',
          body: JSON.stringify({
            payment: {
              payment_type: form.payment_type,
              title: form.title,
              description: form.description,
              amount_pence: amountPence,
              due_at: form.due_at || null,
              match_id: form.match_id || null,
              recipient_scope: form.recipient_scope,
              user_ids: form.user_ids,
            },
          }),
        })
        setSuccess(data.message || 'Payment requests sent successfully.')
      }

      setShowRequestForm(false)
      setForm((current) => ({ ...current, amount: '', description: '', user_ids: [], incident_minute: '', evidence_url: '' }))
      await loadPage()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setProcessing('')
    }
  }

  async function paymentAction(payment, action, payload = {}) {
    resetMessages()
    setProcessing(`${action}-${payment.id}`)
    try {
      const data = await request(`/teams/${teamId}/payments/${payment.id}/${action}`, {
        method: 'POST',
        body: Object.keys(payload).length ? JSON.stringify({ payment: payload }) : undefined,
      })
      setSuccess(data.message || 'Payment updated successfully.')
      await loadPage()
      return data
    } catch (actionError) {
      setError(actionError.message)
      return null
    } finally {
      setProcessing('')
    }
  }

  async function recordPayment(payment) {
    const value = window.prompt(
      `Amount received from ${fullName(payment.user)}:`,
      (Number(payment.amount_outstanding_pence || 0) / 100).toFixed(2),
    )
    if (value === null) return
    const amountPence = Math.round(Number(value) * 100)
    if (!amountPence) return setError('Enter a valid amount.')

    const method = window.prompt('Payment method: cash, bank_transfer or other', 'cash')
    if (!method) return
    await paymentAction(payment, 'record_payment', { amount_pence: amountPence, payment_method: method })
  }

  async function editPayment(payment) {
    const amount = window.prompt(
      `Total requested from ${fullName(payment.user)}:`,
      (Number(payment.amount_pence || 0) / 100).toFixed(2),
    )
    if (amount === null) return
    const amountPence = Math.round(Number(amount) * 100)
    if (!amountPence || amountPence < Number(payment.amount_paid_pence || 0)) {
      setError('The total must be valid and cannot be lower than the amount already paid.')
      return
    }

    const dueAt = window.prompt(
      'Payment deadline (YYYY-MM-DD), or leave blank for no deadline:',
      payment.due_at ? payment.due_at.slice(0, 10) : '',
    )
    if (dueAt === null) return

    resetMessages()
    setProcessing(`edit-${payment.id}`)
    try {
      await request(`/teams/${teamId}/payments/${payment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          payment: {
            amount_pence: amountPence,
            due_at: dueAt || null,
          },
        }),
      })
      setSuccess('Payment request updated.')
      await loadPage()
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setProcessing('')
    }
  }

  async function refundPayment(payment) {
    const value = window.prompt('Refund amount:', (Number(payment.amount_paid_pence || 0) / 100).toFixed(2))
    if (value === null) return
    const amountPence = Math.round(Number(value) * 100)
    if (!amountPence) return setError('Enter a valid refund amount.')
    if (!window.confirm(`Refund ${currency(amountPence)} to ${fullName(payment.user)}?`)) return
    await paymentAction(payment, 'refund', { amount_pence: amountPence })
  }

  async function cancelPayment(payment) {
    if (!window.confirm(`Cancel ${payment.title} for ${fullName(payment.user)}?`)) return
    resetMessages()
    setProcessing(`cancel-${payment.id}`)
    try {
      await request(`/teams/${teamId}/payments/${payment.id}`, { method: 'DELETE' })
      setSuccess('Payment request cancelled.')
      await loadPage()
    } catch (cancelError) {
      setError(cancelError.message)
    } finally {
      setProcessing('')
    }
  }

  async function openCheckout(payment) {
    resetMessages()
    setProcessing(`checkout-${payment.id}`)
    try {
      const data = await request(`/teams/${teamId}/payments/${payment.id}/checkout`, { method: 'POST' })
      if (!data.checkout_url) throw new Error('Stripe did not return a checkout link.')
      if (Capacitor.getPlatform() === 'ios') {
        const listener = await Browser.addListener('browserFinished', async () => {
          await listener.remove()
          await loadPage()
        })
        await Browser.open({ url: data.checkout_url, presentationStyle: 'fullscreen' })
      } else {
        window.location.assign(data.checkout_url)
      }
    } catch (checkoutError) {
      setError(checkoutError.message)
    } finally {
      setProcessing('')
    }
  }

  async function askManager(payment) {
    const message = window.prompt(`What would you like to ask about ${payment.title}?`)
    if (!message?.trim()) return
    const data = await paymentAction(payment, 'ask_manager', { message: message.trim() })
    if (data?.conversation_id) navigate(`/teams/${teamId}/messages/${data.conversation_id}`)
  }

  async function downloadReceipt(payment) {
    resetMessages()
    try {
      const data = await request(`/teams/${teamId}/payments/${payment.id}/receipt`)
      const receiptData = data.receipt
      const text = [
        'MATCHMUSTER PAYMENT RECEIPT',
        `Reference: ${receiptData.reference}`,
        `Team: ${receiptData.team_name}`,
        `Player: ${fullName(receiptData.player)}`,
        `Payment: ${receiptData.title}`,
        `Amount paid: ${currency(receiptData.amount_paid_pence)}`,
        `Method: ${receiptData.payment_method || 'Recorded payment'}`,
        `Paid: ${displayDate(receiptData.paid_at, true)}`,
      ].join('\n')
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${receiptData.reference}.txt`
      link.click()
      URL.revokeObjectURL(url)
    } catch (receiptError) {
      setError(receiptError.message)
    }
  }

  async function saveTemplate(event) {
    event.preventDefault()
    resetMessages()
    if (!templateForm.name.trim() || !form.amount) return setError('Add a template name and amount first.')
    if (templateForm.recurrence === 'monthly' && (form.payment_type === 'match_sub' || isFine)) {
      return setError('Monthly schedules are only available for team-level payments.')
    }
    setProcessing('template')
    try {
      await request(`/teams/${teamId}/payment_templates`, {
        method: 'POST',
        body: JSON.stringify({
          payment_template: {
            name: templateForm.name.trim(),
            payment_type: form.payment_type,
            title: form.title,
            description: form.description,
            amount_pence: Math.round(Number(form.amount) * 100),
            default_due_days: 7,
            recurrence: templateForm.recurrence,
            next_run_on: templateForm.recurrence === 'monthly' ? templateForm.next_run_on : null,
            active: true,
          },
        }),
      })
      setSuccess('Payment template saved.')
      setTemplateForm({ name: '', recurrence: 'none', next_run_on: '' })
      await loadPage()
    } catch (templateError) {
      setError(templateError.message)
    } finally {
      setProcessing('')
    }
  }

  function applyTemplate(template) {
    setForm((current) => ({
      ...current,
      payment_type: template.payment_type,
      title: template.title,
      description: template.description || '',
      amount: (Number(template.amount_pence) / 100).toFixed(2),
    }))
    setShowRequestForm(true)
    setActiveView('payments')
  }

  async function removeTemplate(template) {
    if (!window.confirm(`Delete the “${template.name}” template?`)) return
    resetMessages()
    try {
      await request(`/teams/${teamId}/payment_templates/${template.id}`, { method: 'DELETE' })
      setSuccess('Template deleted.')
      await loadPage()
    } catch (templateError) {
      setError(templateError.message)
    }
  }

  async function updateDiscipline(record) {
    const remaining = window.prompt(
      `Suspension matches remaining for ${fullName(record.player)}:`,
      String(record.suspension_matches_remaining || 0),
    )
    if (remaining === null) return
    const appeal = window.prompt(
      'Appeal status: not_applicable, pending, upheld or overturned',
      record.appeal_status,
    )
    if (!appeal) return

    resetMessages()
    setProcessing(`discipline-${record.id}`)
    try {
      await request(`/teams/${teamId}/disciplinary_records/${record.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          disciplinary_record: {
            suspension_matches_remaining: Number(remaining),
            appeal_status: appeal,
          },
        }),
      })
      setSuccess('Disciplinary record updated.')
      await loadPage()
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setProcessing('')
    }
  }

  if (loading) return <p className="dashboard-message">Loading Payments...</p>

  if (pageLocked) {
    const ownerCanUpgrade =
      team?.multi_team_access?.owned_by_current_manager === true

    return (
      <>
        <Navbar teamId={teamId} currentUser={currentUser} />
        <main className="team-payments-page">
          <section className="team-payments-shell">
            <section className="team-payment-page-lock">
              <LockKeyhole size={30} aria-hidden="true" />
              <span>MATCHMUSTER PLUS</span>
              <h1 className="mm-page-title">Plus payments</h1>
              <p>
                Unlock fines, training and membership payments, templates,
                reminders, recurring requests and discipline controls.
              </p>
              {ownerCanUpgrade && (
                <button
                  type="button"
                  onClick={() => navigate(`/teams/${teamId}/subscription`)}
                >
                  View MatchMuster Plus
                </button>
              )}
            </section>
          </section>
        </main>
      </>
    )
  }

  const outstanding = payments.filter((payment) => ['pending', 'cash_pending', 'partially_paid'].includes(payment.status))
  const ownBalance = outstanding.reduce((sum, payment) => sum + Number(payment.amount_outstanding_pence || 0), 0)
  const requestedTotal = summary?.total_requested_pence ?? payments.reduce((sum, payment) => sum + Number(payment.amount_pence || 0), 0)
  const collectedTotal = summary
    ? Number(summary.total_paid_pence || 0) - Number(summary.total_refunded_pence || 0)
    : payments.reduce((sum, payment) => sum + Math.max(0, Number(payment.amount_paid_pence || 0) - Number(payment.refunded_amount_pence || 0)), 0)

  return (
    <>
      <Navbar teamId={teamId} currentUser={currentUser} />
      <main className="team-payments-page">
        <section className="team-payments-shell">
          <header className="team-payments-heading">
            <div>
              <span>{isManager ? 'TEAM PAYMENT CONTROL' : 'MY TEAM PAYMENTS'}</span>
              <h1 className="mm-page-title">Payments</h1>
              <p>{isManager ? 'Request, collect and track team payments in one place.' : 'View your requests, balances and payment history.'}</p>
            </div>
            {isManager && (
              <button type="button" className="team-payments-primary" onClick={() => setShowRequestForm((value) => !value)}>
                New request
              </button>
            )}
          </header>

          {error && <p className="team-payments-alert error" role="alert">{error}</p>}
          {success && <p className="team-payments-alert success" role="status">{success}</p>}
          {checkoutNotice && <p className="team-payments-alert" role="status">{checkoutNotice}</p>}

          <section className="team-payment-metrics" aria-label="Payment summary">
            <article><WalletCards aria-hidden="true" /><span>{isManager ? 'Requested' : 'Outstanding'}</span><strong>{currency(isManager ? requestedTotal : ownBalance)}</strong></article>
            <article className="collected"><CheckCircle2 aria-hidden="true" /><span>{isManager ? 'Collected' : 'Paid'}</span><strong>{currency(isManager ? collectedTotal : payments.reduce((sum, payment) => sum + Number(payment.amount_paid_pence || 0), 0))}</strong></article>
            <article className="outstanding"><AlertTriangle aria-hidden="true" /><span>Outstanding</span><strong>{isManager ? Object.values(playerBalances).filter((value) => value > 0).length : outstanding.length}</strong><small>{isManager ? 'players with a balance' : 'payment requests'}</small></article>
            <article><ShieldAlert aria-hidden="true" /><span>Fines</span><strong>{payments.filter((payment) => FINE_TYPES.includes(payment.payment_type)).length}</strong><small>disciplinary charges</small></article>
          </section>

          {isManager && analyticsLocked && (
            <section className="team-payment-plus-card">
              <LockKeyhole aria-hidden="true" />
              <div><strong>Payment analytics</strong><span>Unlock collection trends, category totals, exports and automatic reminders with Plus.</span></div>
              {team?.multi_team_access?.owned_by_current_manager && <button type="button" onClick={() => navigate(`/teams/${teamId}/subscription`)}>View Plus</button>}
            </section>
          )}

          <nav className="team-payment-tabs" aria-label="Payment sections">
            <button type="button" className={activeView === 'payments' ? 'active' : ''} onClick={() => setActiveView('payments')}><CreditCard size={18} />Payments <span>{payments.length}</span></button>
            <button type="button" className={activeView === 'discipline' ? 'active' : ''} onClick={() => setActiveView('discipline')}><ShieldAlert size={18} />Discipline <span>{discipline.length}</span></button>
            {isManager && <button type="button" className={activeView === 'templates' ? 'active' : ''} onClick={() => setActiveView('templates')}><FileText size={18} />Templates <span>{templates.length}</span></button>}
            {isManager && <button type="button" onClick={() => navigate(`/teams/${teamId}/payments/analytics`)}><BarChart3 size={18} />Analytics <small>PLUS</small></button>}
          </nav>

          {isManager && showRequestForm && (
            <form className="team-payment-request-card" onSubmit={submitPayment}>
              <header><div><span>NEW TEAM PAYMENT</span><h2>Create a payment request</h2></div><button type="button" onClick={() => setShowRequestForm(false)}>Close</button></header>
              <div className="team-payment-form-grid">
                <label>Payment type<select value={form.payment_type} onChange={(event) => changeType(event.target.value)}>{Object.entries(paymentTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>Title<input value={form.title} maxLength="100" onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
                {(!isFine || form.issue_fine) && <label>Amount per player<div className="team-payment-money"><span>£</span><input type="number" inputMode="decimal" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></div></label>}
                <label>Payment deadline<input type="date" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} /></label>
                {matchRequired && <label>Match<select value={form.match_id} onChange={(event) => setForm({ ...form, match_id: event.target.value })} required><option value="">Select match</option>{context.matches.map((match) => <option key={match.id} value={match.id}>vs {match.opponent} · {displayDate(match.kickoff_time)}</option>)}</select></label>}
                {!isFine && <label>Who should receive it?<select value={form.recipient_scope} onChange={(event) => setForm({ ...form, recipient_scope: event.target.value })}><option value="selected_squad">Selected Matchday squad</option><option value="all_players">All approved players</option><option value="selected">Choose players</option></select></label>}
                {(isFine || form.recipient_scope === 'selected') && <label className="team-payment-player-select">{isFine ? 'Player' : 'Players'}<select multiple={!isFine} value={form.user_ids} onChange={(event) => setForm({ ...form, user_ids: Array.from(event.target.selectedOptions, (option) => option.value) })}>{context.players.map((player) => <option key={player.id} value={player.id}>{fullName(player)}</option>)}</select><small>{!isFine && 'Hold Cmd or Ctrl to select several players.'}</small></label>}
                {isFine && <><label className="team-payment-checkbox"><input type="checkbox" checked={form.issue_fine} onChange={(event) => setForm({ ...form, issue_fine: event.target.checked })} />Create a player fine for this card</label><label>Incident minute<input type="number" min="1" max="130" value={form.incident_minute} onChange={(event) => setForm({ ...form, incident_minute: event.target.value })} /></label><label>Suspension matches<input type="number" min="0" value={form.suspension_matches} onChange={(event) => setForm({ ...form, suspension_matches: event.target.value })} /></label><label>Appeal status<select value={form.appeal_status} onChange={(event) => setForm({ ...form, appeal_status: event.target.value })}><option value="not_applicable">Not applicable</option><option value="pending">Appeal pending</option><option value="upheld">Upheld</option><option value="overturned">Overturned</option></select></label><label>Evidence link (optional)<input type="url" value={form.evidence_url} onChange={(event) => setForm({ ...form, evidence_url: event.target.value })} placeholder="https://…" /></label></>}
                <label className="team-payment-description">Reason or note<textarea rows="3" maxLength="500" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={isFine ? 'Reason for the card or disciplinary charge' : 'What the payment is for'} /></label>
              </div>
              <footer><span>{form.amount && (!isFine || form.issue_fine) && `${currency(Math.round(Number(form.amount) * 100))} per player`}</span><button className="team-payments-primary" type="submit" disabled={processing === 'create'}>{processing === 'create' ? 'Saving...' : isFine ? form.issue_fine ? 'Record card and send fine' : 'Record card only' : 'Send payment request'}</button></footer>
            </form>
          )}

          {activeView === 'payments' && (
            <>
              <section className="team-payment-filters">
                <label><Search size={18} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player, payment or fixture" /></label>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by payment status"><option value="all">All statuses</option><option value="pending">Awaiting payment</option><option value="cash_pending">Cash confirmation</option><option value="partially_paid">Partially paid</option><option value="overdue">Overdue</option><option value="paid">Paid</option><option value="waived">Waived</option><option value="refunded">Refunded</option><option value="cancelled">Cancelled</option></select>
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by payment type"><option value="all">All payment types</option>{Object.entries(paymentTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              </section>

              <section className="team-payment-list">
                {filteredPayments.map((payment) => {
                  const busy = processing.endsWith(`-${payment.id}`)
                  return <article className={`team-payment-card status-${payment.overdue ? 'overdue' : payment.status}`} key={payment.id}>
                    <div className="team-payment-card-main">
                      <div className="team-payment-avatar" aria-hidden="true">{fullName(payment.user).charAt(0)}</div>
                      <div className="team-payment-card-copy">
                        <span>{payment.type_label}</span><h2>{payment.title}</h2>
                        <p>{isManager && <strong>{fullName(payment.user)} · </strong>}{payment.match ? `vs ${payment.match.opponent}` : payment.description || 'Team payment'}</p>
                        <small><CalendarDays size={14} />{payment.due_at ? `Due ${displayDate(payment.due_at)}` : 'No deadline'}{payment.viewed_at && isManager ? ' · Viewed' : ''}</small>
                      </div>
                    </div>
                    <div className="team-payment-card-value"><strong>{currency(payment.amount_outstanding_pence || payment.amount_pence)}</strong>{payment.amount_paid_pence > 0 && payment.status !== 'paid' && <small>{currency(payment.amount_paid_pence)} paid</small>}<span className={`team-payment-status ${payment.overdue ? 'overdue' : payment.status}`}>{statusLabel(payment)}</span></div>
                    <div className="team-payment-actions">
                      {isManager ? <>
                        {['pending', 'cash_pending', 'partially_paid'].includes(payment.status) && <><button type="button" onClick={() => editPayment(payment)} disabled={busy}>Edit</button><button type="button" onClick={() => recordPayment(payment)} disabled={busy}>Record payment</button><button type="button" onClick={() => paymentAction(payment, 'remind')} disabled={busy}>Remind</button></>}
                        {['pending', 'cash_pending'].includes(payment.status) && <><button type="button" onClick={() => paymentAction(payment, 'waive')} disabled={busy}>Waive</button><button className="danger" type="button" onClick={() => cancelPayment(payment)} disabled={busy}>Cancel</button></>}
                        {payment.status === 'paid' && <><button type="button" onClick={() => downloadReceipt(payment)}><Receipt size={16} />Receipt</button><button type="button" onClick={() => refundPayment(payment)} disabled={busy}>Refund</button>{payment.payment_type !== 'match_sub' && <button type="button" onClick={() => paymentAction(payment, 'add_to_finance')} disabled={busy}>Add to Club Finance</button>}{FINE_TYPES.includes(payment.payment_type) && !payment.league_settled_at && <button type="button" onClick={() => paymentAction(payment, 'mark_league_settled')} disabled={busy}>Passed to league</button>}</>}
                      </> : <>
                        {['pending', 'partially_paid'].includes(payment.status) && <button className="pay" type="button" onClick={() => openCheckout(payment)} disabled={busy}>Pay {currency(payment.amount_outstanding_pence)}</button>}
                        {['pending', 'partially_paid'].includes(payment.status) && <button type="button" onClick={() => paymentAction(payment, 'request_cash_confirmation')} disabled={busy}>I paid cash</button>}
                        <button type="button" onClick={() => askManager(payment)} disabled={busy}><MessageCircle size={16} />Ask manager</button>
                        {['paid', 'refunded'].includes(payment.status) && <button type="button" onClick={() => downloadReceipt(payment)}><Download size={16} />Receipt</button>}
                      </>}
                    </div>
                  </article>
                })}
                {filteredPayments.length === 0 && <section className="team-payment-empty"><CreditCard aria-hidden="true" /><h2>No payments found</h2><p>{isManager ? 'Create a request or change your filters.' : 'You have no payment requests matching these filters.'}</p></section>}
              </section>
            </>
          )}

          {activeView === 'discipline' && (
            <section className="team-discipline-list">
              <header><div><span>CARD & SUSPENSION RECORDS</span><h2>Discipline</h2></div>{isManager && <button className="team-payments-primary" type="button" onClick={() => { changeType('yellow_card_fine'); setShowRequestForm(true); setActiveView('payments') }}>Record card or fine</button>}</header>
              {discipline.map((record) => <article key={record.id}>
                <div className={`discipline-card-icon ${record.card_type}`} aria-hidden="true" />
                <div><span>{record.card_type.replaceAll('_', ' ')}</span><h3>{fullName(record.player)}</h3><p>vs {record.match.opponent}{record.incident_minute ? ` · ${record.incident_minute}′` : ''}</p>{record.reason && <small>{record.reason}</small>}{record.evidence_url && <a href={record.evidence_url} target="_blank" rel="noreferrer"><FileText size={14} />View evidence</a>}</div>
                <div><strong>{record.suspension_matches_remaining}</strong><span>matches remaining</span><small>Appeal: {record.appeal_status.replaceAll('_', ' ')}</small>{isManager && <button type="button" onClick={() => updateDiscipline(record)} disabled={processing === `discipline-${record.id}`}>Update</button>}</div>
              </article>)}
              {discipline.length === 0 && <section className="team-payment-empty"><ShieldAlert aria-hidden="true" /><h2>No disciplinary records</h2><p>Cards and suspensions recorded after matches will appear here.</p></section>}
            </section>
          )}

          {activeView === 'templates' && isManager && (
            <section className="team-payment-template-section">
              {!context.plus.saved_payment_templates ? <section className="team-payment-plus-card"><LockKeyhole aria-hidden="true" /><div><strong>Saved templates are included with Plus</strong><span>Reuse common charges and schedule monthly membership payments.</span></div></section> : <>
                <header><div><span>PLUS AUTOMATION</span><h2>Payment templates</h2></div></header>
                <div className="team-payment-template-grid">{templates.map((template) => <article key={template.id}><span>{template.recurrence === 'monthly' ? 'MONTHLY' : 'SAVED'}</span><h3>{template.name}</h3><p>{template.title}</p><strong>{currency(template.amount_pence)}</strong>{template.next_run_on && <small>Next run {displayDate(template.next_run_on)}</small>}<footer><button type="button" onClick={() => applyTemplate(template)}>Use template</button><button className="danger" type="button" onClick={() => removeTemplate(template)}>Delete</button></footer></article>)}</div>
                <form className="team-payment-template-form" onSubmit={saveTemplate}><h3>Save the current request as a template</h3><div><label>Template name<input value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} required /></label><label>Schedule<select value={templateForm.recurrence} onChange={(event) => setTemplateForm({ ...templateForm, recurrence: event.target.value })}><option value="none">Saved template only</option><option value="monthly" disabled={form.payment_type === 'match_sub' || isFine}>Repeat monthly</option></select></label>{templateForm.recurrence === 'monthly' && <label>First run<input type="date" value={templateForm.next_run_on} onChange={(event) => setTemplateForm({ ...templateForm, next_run_on: event.target.value })} required /></label>}<button className="team-payments-primary" type="submit" disabled={processing === 'template'}><Save size={17} />Save template</button></div><small>Uses the payment type, title, note and amount currently entered in New request. Monthly schedules are for team-level payments.</small></form>
              </>}
            </section>
          )}
        </section>
      </main>
    </>
  )
}

export default TeamPaymentsPage
