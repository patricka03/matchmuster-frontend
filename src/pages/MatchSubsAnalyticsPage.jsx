import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  CreditCard,
  Download,
  LockKeyhole,
  Search,
  SlidersHorizontal,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import Navbar from '../components/Navbar'
import API_URL from '../config/api'
import { clearAuthToken, getAuthToken } from '../utils/authStorage'
import './MatchSubsAnalyticsPage.css'

function currency(pence) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(Number(pence || 0) / 100)
}

function playerName(payment) {
  const fullName = [payment.user?.first_name, payment.user?.last_name]
    .filter(Boolean)
    .join(' ')
  return fullName || payment.user?.name || payment.user_name || 'Unknown player'
}

function displayDate(value, fallback = '—') {
  if (!value) return fallback
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function statusLabel(status) {
  if (status === 'paid') return 'Paid'
  if (status === 'waived') return 'Waived'
  if (status === 'refunded') return 'Refunded'
  return 'Outstanding'
}

function paymentMethod(payment) {
  if (payment.status !== 'paid') return 'Not paid'
  return payment.stripe_payment_intent_id ? 'Stripe' : 'Cash'
}

function escapeCsv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function MatchSubsAnalyticsPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()
  const [currentUser, setCurrentUser] = useState(null)
  const [team, setTeam] = useState(null)
  const [rows, setRows] = useState([])
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [method, setMethod] = useState('all')
  const [sort, setSort] = useState('newest')

  const redirectToLogin = useCallback(async () => {
    await clearAuthToken()
    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    let cancelled = false

    async function loadAnalytics() {
      const token = getAuthToken()
      if (!token) {
        await redirectToLogin()
        return
      }

      const headers = { Accept: 'application/json', Authorization: token }
      try {
        const [userResponse, teamResponse, matchesResponse, plusResponse] = await Promise.all([
          fetch(`${API_URL}/users/me`, { headers }),
          fetch(`${API_URL}/teams/${teamId}`, { headers }),
          fetch(`${API_URL}/teams/${teamId}/matches`, { headers }),
          fetch(`${API_URL}/teams/${teamId}/finance`, { headers }),
        ])

        if ([userResponse, teamResponse, matchesResponse, plusResponse].some((response) => response.status === 401)) {
          await redirectToLogin()
          return
        }

        const [userData, teamData, matchesData, plusData] = await Promise.all([
          userResponse.json().catch(() => ({})),
          teamResponse.json().catch(() => ({})),
          matchesResponse.json().catch(() => ([])),
          plusResponse.json().catch(() => ({})),
        ])
        const user = userData.user || userData
        const currentTeam = teamData.team || teamData

        if (!cancelled) {
          setCurrentUser(user)
          setTeam(currentTeam)
        }

        if (plusResponse.status === 403 && plusData.code === 'plus_required') {
          if (!cancelled) setLocked(true)
          return
        }

        if (!matchesResponse.ok) {
          throw new Error(matchesData.error || 'Unable to load Match Subs analytics.')
        }

        const matches = Array.isArray(matchesData) ? matchesData : matchesData.matches || []
        const fixturePayments = await Promise.all(
          matches.map(async (match) => {
            const response = await fetch(
              `${API_URL}/teams/${teamId}/matches/${match.id}/match_payments`,
              { headers },
            )
            if (!response.ok) return []
            const data = await response.json().catch(() => ([]))
            const payments = Array.isArray(data) ? data : data.match_payments || []
            return payments.map((payment) => ({
              ...payment,
              match_id: match.id,
              opponent: match.opponent,
              kickoff_time: match.kickoff_time,
            }))
          }),
        )

        if (!cancelled) {
          setLocked(false)
          setRows(fixturePayments.flat())
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.message || 'Unable to load Match Subs analytics.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadAnalytics()
    return () => { cancelled = true }
  }, [redirectToLogin, teamId])

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matches = rows.filter((row) => {
      const searchable = [
        playerName(row),
        row.opponent,
        statusLabel(row.status),
        paymentMethod(row),
        currency(row.amount_pence),
        displayDate(row.kickoff_time),
      ].join(' ').toLowerCase()
      return (
        (!needle || searchable.includes(needle)) &&
        (status === 'all' || row.status === status) &&
        (method === 'all' || paymentMethod(row).toLowerCase() === method)
      )
    })

    return [...matches].sort((a, b) => {
      if (sort === 'oldest') return new Date(a.kickoff_time) - new Date(b.kickoff_time)
      if (sort === 'highest') return Number(b.amount_pence) - Number(a.amount_pence)
      if (sort === 'lowest') return Number(a.amount_pence) - Number(b.amount_pence)
      return new Date(b.kickoff_time) - new Date(a.kickoff_time)
    })
  }, [method, query, rows, sort, status])

  const totals = useMemo(() => rows.reduce((result, row) => {
    const amount = Number(row.amount_pence || 0)
    result.requested += amount
    if (row.status === 'paid') {
      result.collected += amount
      if (paymentMethod(row) === 'Cash') result.cash += amount
      if (paymentMethod(row) === 'Stripe') result.stripe += amount
    }
    if (row.status === 'pending') result.outstanding += amount
    if (row.status === 'waived') result.waived += amount
    return result
  }, { requested: 0, collected: 0, outstanding: 0, waived: 0, cash: 0, stripe: 0 }), [rows])

  const collectionRate = totals.requested > 0
    ? Math.round((totals.collected / totals.requested) * 100)
    : 0

  const monthlyCollections = useMemo(() => {
    const values = rows
      .filter((row) => row.status === 'paid')
      .reduce((result, row) => {
        const date = new Date(row.paid_at || row.kickoff_time)
        if (Number.isNaN(date.getTime())) return result
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const label = new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit' }).format(date)
        result[key] ||= { key, label, amount: 0 }
        result[key].amount += Number(row.amount_pence || 0)
        return result
      }, {})
    return Object.values(values).sort((a, b) => a.key.localeCompare(b.key)).slice(-6)
  }, [rows])
  const highestMonth = Math.max(...monthlyCollections.map((item) => item.amount), 0)

  const outstandingPlayers = useMemo(() => {
    const values = rows
      .filter((row) => row.status === 'pending')
      .reduce((result, row) => {
        const name = playerName(row)
        result[name] ||= { name, amount: 0, count: 0 }
        result[name].amount += Number(row.amount_pence || 0)
        result[name].count += 1
        return result
      }, {})
    return Object.values(values).sort((a, b) => b.amount - a.amount)
  }, [rows])

  async function exportCsv() {
    const csvRows = [
      ['Fixture date', 'Opponent', 'Player', 'Status', 'Method', 'Amount GBP', 'Paid date'],
      ...filteredRows.map((row) => [
        row.kickoff_time,
        row.opponent,
        playerName(row),
        statusLabel(row.status),
        paymentMethod(row),
        (Number(row.amount_pence || 0) / 100).toFixed(2),
        row.paid_at || '',
      ]),
    ]
    const csv = csvRows.map((row) => row.map(escapeCsv).join(',')).join('\n')
    const fileName = `${team?.name || 'club'}-match-subs.csv`
    const file = new File([csv], fileName, { type: 'text/csv;charset=utf-8' })

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${team?.name || 'Club'} Match Subs statement` })
      } catch (shareError) {
        if (shareError.name !== 'AbortError') setError('The payment statement could not be shared.')
      }
      return
    }

    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p className="dashboard-message">Loading payment analytics...</p>

  const ownerCanUpgrade = team?.multi_team_access?.owned_by_current_manager === true

  if (locked) {
    return (
      <>
        <Navbar teamId={teamId} currentUser={currentUser} />
        <main className="match-subs-analytics-page">
          <section className="match-subs-analytics-shell">
            <section className="match-subs-analytics-lock">
              <LockKeyhole size={29} aria-hidden="true" />
              <span>MATCHMUSTER PLUS</span>
              <h1 className="mm-page-title">Payment analytics</h1>
              <p>Understand collections, outstanding balances and payment methods across every fixture.</p>
              {ownerCanUpgrade && <button type="button" onClick={() => navigate(`/teams/${teamId}/subscription`)}>View MatchMuster Plus</button>}
            </section>
          </section>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar teamId={teamId} currentUser={currentUser} />
      <main className="match-subs-analytics-page">
        <section className="match-subs-analytics-shell">
          <header className="match-subs-analytics-heading">
            <div><span>PLUS • PAYMENT CONTROL</span><h1 className="mm-page-title">Match Subs analytics</h1></div>
            <button type="button" onClick={exportCsv} disabled={filteredRows.length === 0}><Download size={18} aria-hidden="true" />Export statement</button>
          </header>

          {error && <p className="match-subs-analytics-error" role="alert">{error}</p>}

          <section className="match-subs-control-card">
            <div className="match-subs-control-heading"><div><span>COLLECTION RATE</span><h2>{collectionRate}% collected</h2></div><strong>{currency(totals.collected)} of {currency(totals.requested)}</strong></div>
            <div className="match-subs-control-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={collectionRate}><span style={{ width: `${Math.min(100, collectionRate)}%` }} /></div>
          </section>

          <section className="match-subs-analytics-metrics" aria-label="Payment totals">
            <article><span>Collected</span><strong>{currency(totals.collected)}</strong><small>Paid Match Subs</small></article>
            <article className="outstanding"><span>Outstanding</span><strong>{currency(totals.outstanding)}</strong><small>{rows.filter((row) => row.status === 'pending').length} unpaid requests</small></article>
            <article><span>Cash</span><strong>{currency(totals.cash)}</strong><small>Recorded as cash paid</small></article>
            <article><span>Stripe</span><strong>{currency(totals.stripe)}</strong><small>Confirmed online</small></article>
          </section>

          <section className="match-subs-analytics-grid">
            <article className="match-subs-chart-card">
              <header><div><span>COLLECTION TREND</span><h2>Last six months</h2></div><TrendingUp size={22} aria-hidden="true" /></header>
              {monthlyCollections.length > 0 ? <div className="match-subs-month-chart">
                {monthlyCollections.map((item) => <div key={item.key}><strong>{currency(item.amount)}</strong><span><i style={{ height: `${Math.max(8, (item.amount / highestMonth) * 100)}%` }} /></span><small>{item.label}</small></div>)}
              </div> : <p className="match-subs-analytics-empty">Paid Match Subs will appear here.</p>}
            </article>

            <article className="match-subs-outstanding-card">
              <header><div><span>ACTION NEEDED</span><h2>Outstanding by player</h2></div><WalletCards size={22} aria-hidden="true" /></header>
              {outstandingPlayers.length > 0 ? <div className="match-subs-outstanding-list">
                {outstandingPlayers.slice(0, 5).map((player) => <div key={player.name}><span><strong>{player.name}</strong><small>{player.count} outstanding {player.count === 1 ? 'request' : 'requests'}</small></span><b>{currency(player.amount)}</b></div>)}
              </div> : <p className="match-subs-analytics-empty">Nothing outstanding. The team is fully up to date.</p>}
            </article>
          </section>

          <section className="match-subs-statement-card">
            <div className="match-subs-section-title"><div><span>STATEMENT</span><h2>Payment history</h2></div><strong>{filteredRows.length}</strong></div>
            <div className="match-subs-analytics-filters">
              <label className="match-subs-analytics-search"><Search size={18} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player, opponent, amount or date" aria-label="Search Match Subs" /></label>
              <label><SlidersHorizontal size={17} aria-hidden="true" /><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by payment status"><option value="all">All statuses</option><option value="pending">Outstanding</option><option value="paid">Paid</option><option value="waived">Waived</option><option value="refunded">Refunded</option></select></label>
              <select value={method} onChange={(event) => setMethod(event.target.value)} aria-label="Filter by payment method"><option value="all">All methods</option><option value="cash">Cash</option><option value="stripe">Stripe</option><option value="not paid">Not paid</option></select>
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort payments"><option value="newest">Newest fixture</option><option value="oldest">Oldest fixture</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select>
            </div>

            <div className="match-subs-statement" role="table" aria-label="Match Subs payment statement">
              <div className="match-subs-statement-head" role="row"><span>Fixture</span><span>Player</span><span>Status</span><span>Method</span><span>Amount</span></div>
              {filteredRows.map((row) => <article className="match-subs-statement-row" role="row" key={`${row.match_id}-${row.id}`}>
                <span><strong>vs {row.opponent}</strong><small>{displayDate(row.kickoff_time)}</small></span>
                <strong>{playerName(row)}</strong>
                <span className={`match-subs-status ${row.status}`}>{statusLabel(row.status)}</span>
                <span className="match-subs-method">{paymentMethod(row) === 'Cash' ? <Banknote size={16} aria-hidden="true" /> : <CreditCard size={16} aria-hidden="true" />}{paymentMethod(row)}</span>
                <b>{currency(row.amount_pence)}</b>
              </article>)}
              {filteredRows.length === 0 && <div className="match-subs-analytics-empty">No payments match your search or filters.</div>}
            </div>
          </section>
        </section>
      </main>
    </>
  )
}

export default MatchSubsAnalyticsPage
