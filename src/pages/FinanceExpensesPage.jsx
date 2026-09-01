import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  Download,
  LockKeyhole,
  Search,
  SlidersHorizontal,
  WalletCards,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import BackButton from '../components/BackButton'
import Navbar from '../components/Navbar'
import API_URL from '../config/api'
import { clearAuthToken, getAuthToken } from '../utils/authStorage'
import './FinanceExpensesPage.css'

function currency(pence) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(Number(pence || 0) / 100)
}

function displayDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function escapeCsv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function FinanceExpensesPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()
  const [currentUser, setCurrentUser] = useState(null)
  const [team, setTeam] = useState(null)
  const [entries, setEntries] = useState([])
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('newest')

  const redirectToLogin = useCallback(async () => {
    await clearAuthToken()
    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    async function loadExpenses() {
      const token = getAuthToken()
      if (!token) {
        await redirectToLogin()
        return
      }

      const headers = { Accept: 'application/json', Authorization: token }
      try {
        const [userResponse, teamsResponse, financeResponse] = await Promise.all([
          fetch(`${API_URL}/users/me`, { headers }),
          fetch(`${API_URL}/teams`, { headers }),
          fetch(`${API_URL}/teams/${teamId}/finance/analytics`, { headers }),
        ])

        if ([userResponse, teamsResponse, financeResponse].some((response) => response.status === 401)) {
          await redirectToLogin()
          return
        }

        const userData = await userResponse.json()
        const teamsData = await teamsResponse.json()
        const financeData = await financeResponse.json().catch(() => ({}))
        const teams = Array.isArray(teamsData) ? teamsData : teamsData.teams || []

        setCurrentUser(userData.user || userData)
        setTeam(teams.find((record) => String(record.id) === String(teamId)) || null)

        if (financeResponse.status === 403 && financeData.code === 'plus_required') {
          setLocked(true)
          return
        }
        if (financeResponse.status === 403) {
          navigate('/dashboard', { replace: true })
          return
        }
        if (!financeResponse.ok) {
          throw new Error(financeData.error || 'Unable to load expenses.')
        }

        setEntries(
          (financeData.entries || []).filter((entry) => entry.entry_type === 'expense'),
        )
      } catch (requestError) {
        setError(requestError.message || 'Unable to load expenses.')
      } finally {
        setLoading(false)
      }
    }

    void loadExpenses()
  }, [navigate, redirectToLogin, teamId])

  const categories = useMemo(
    () => [...new Set(entries.map((entry) => entry.category).filter(Boolean))].sort(),
    [entries],
  )

  const categoryTotals = useMemo(() => {
    const totals = entries.reduce((result, entry) => {
      const name = entry.category || 'Uncategorised'
      result[name] = (result[name] || 0) + Number(entry.amount_pence || 0)
      return result
    }, {})
    return Object.entries(totals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [entries])

  const filteredEntries = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase()
    const matches = entries.filter((entry) => {
      const searchable = [
        entry.description,
        entry.category,
        displayDate(entry.occurred_on),
        currency(entry.amount_pence),
      ].join(' ').toLowerCase()
      return (
        (!normalisedQuery || searchable.includes(normalisedQuery)) &&
        (category === 'all' || entry.category === category)
      )
    })

    return [...matches].sort((a, b) => {
      if (sort === 'oldest') return String(a.occurred_on).localeCompare(String(b.occurred_on))
      if (sort === 'highest') return Number(b.amount_pence) - Number(a.amount_pence)
      if (sort === 'lowest') return Number(a.amount_pence) - Number(b.amount_pence)
      return String(b.occurred_on).localeCompare(String(a.occurred_on))
    })
  }, [category, entries, query, sort])

  const totalSpent = entries.reduce((total, entry) => total + Number(entry.amount_pence || 0), 0)
  const filteredTotal = filteredEntries.reduce(
    (total, entry) => total + Number(entry.amount_pence || 0),
    0,
  )
  const largestCategory = categoryTotals[0]
  const largestAmount = largestCategory?.amount || 0

  async function exportCsv() {
    const rows = [
      ['Date', 'Description', 'Category', 'Amount GBP'],
      ...filteredEntries.map((entry) => [
        entry.occurred_on,
        entry.description,
        entry.category,
        (Number(entry.amount_pence || 0) / 100).toFixed(2),
      ]),
    ]
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
    const fileName = `${team?.name || 'club'}-expenses.csv`
    const file = new File([csv], fileName, { type: 'text/csv;charset=utf-8' })

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${team?.name || 'Club'} expense statement`,
        })
      } catch (shareError) {
        if (shareError.name !== 'AbortError') {
          setError('The expense statement could not be shared.')
        }
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

  if (loading) return <p className="dashboard-message">Loading expenses...</p>

  const ownerCanUpgrade = team?.multi_team_access?.owned_by_current_manager === true

  if (locked) {
    return (
      <>
        <Navbar teamId={teamId} currentUser={currentUser} />
        <main className="finance-expenses-page">
          <section className="finance-expenses-shell">
            <BackButton to={`/teams/${teamId}/finance/analytics`} label="Back to finance analytics" />
            <section className="finance-expenses-lock">
              <LockKeyhole size={28} aria-hidden="true" />
              <span>MATCHMUSTER PLUS</span>
              <h1 className="mm-page-title">Expense statements</h1>
              <p>Search, analyse and export every club expense with MatchMuster Plus.</p>
              {ownerCanUpgrade && (
                <button type="button" onClick={() => navigate(`/teams/${teamId}/subscription`)}>
                  View MatchMuster Plus
                </button>
              )}
            </section>
          </section>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar teamId={teamId} currentUser={currentUser} />
      <main className="finance-expenses-page">
        <section className="finance-expenses-shell">
          <BackButton to={`/teams/${teamId}/finance/analytics`} label="Back to finance analytics" />

          <header className="finance-expenses-heading">
            <div>
              <span>PLUS • EXPENSE STATEMENT</span>
              <h1 className="mm-page-title">Club expenses</h1>
              <p>Find every cost and understand exactly where the club’s money goes.</p>
            </div>
            <button type="button" onClick={exportCsv} disabled={filteredEntries.length === 0}>
              <Download size={18} aria-hidden="true" />
              Export CSV
            </button>
          </header>

          {error && <p className="finance-expenses-error" role="alert">{error}</p>}

          <section className="finance-expenses-metrics" aria-label="Expense summary">
            <article><span>All-time spend</span><strong>{currency(totalSpent)}</strong><small>{entries.length} recorded expenses</small></article>
            <article><span>Current results</span><strong>{currency(filteredTotal)}</strong><small>{filteredEntries.length} matching expenses</small></article>
            <article><span>Largest category</span><strong>{largestCategory?.name || 'No spending yet'}</strong><small>{largestCategory ? currency(largestCategory.amount) : 'Add an expense to begin'}</small></article>
          </section>

          <section className="finance-category-card">
            <div className="finance-expenses-section-title">
              <div><span>SPENDING ANALYSIS</span><h2>Where the money goes</h2></div>
              <WalletCards size={22} aria-hidden="true" />
            </div>
            {categoryTotals.length > 0 ? (
              <div className="finance-category-bars">
                {categoryTotals.map((item) => (
                  <div className="finance-category-bar-row" key={item.name}>
                    <div><strong>{item.name}</strong><span>{currency(item.amount)}</span></div>
                    <div className="finance-category-bar-track" aria-label={`${item.name}: ${currency(item.amount)}`}>
                      <span style={{ width: `${Math.max(5, (item.amount / largestAmount) * 100)}%` }} />
                    </div>
                    <small>{Math.round((item.amount / totalSpent) * 100)}% of total spending</small>
                  </div>
                ))}
              </div>
            ) : <p className="finance-expenses-empty">No expenses have been recorded yet.</p>}
          </section>

          <section className="finance-statement-card">
            <div className="finance-expenses-section-title">
              <div><span>STATEMENT</span><h2>Expense history</h2></div>
              <strong>{filteredEntries.length}</strong>
            </div>

            <div className="finance-expense-filters">
              <label className="finance-expense-search">
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search description, category, amount or date"
                  aria-label="Search expenses"
                />
              </label>
              <label>
                <SlidersHorizontal size={17} aria-hidden="true" />
                <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
                  <option value="all">All categories</option>
                  {categories.map((name) => <option value={name} key={name}>{name}</option>)}
                </select>
              </label>
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort expenses">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest amount</option>
                <option value="lowest">Lowest amount</option>
              </select>
            </div>

            <div className="finance-expense-table" role="table" aria-label="Club expense statement">
              <div className="finance-expense-table-head" role="row">
                <span>Date</span><span>Description</span><span>Category</span><span>Amount</span>
              </div>
              {filteredEntries.map((entry) => (
                <article className="finance-expense-table-row" role="row" key={entry.id}>
                  <time dateTime={entry.occurred_on}>{displayDate(entry.occurred_on)}</time>
                  <strong><ArrowDownRight size={17} aria-hidden="true" />{entry.description}</strong>
                  <span>{entry.category}</span>
                  <b>-{currency(entry.amount_pence)}</b>
                </article>
              ))}
              {filteredEntries.length === 0 && (
                <div className="finance-expenses-empty">No expenses match your search or filters.</div>
              )}
            </div>
          </section>
        </section>
      </main>
    </>
  )
}

export default FinanceExpensesPage
