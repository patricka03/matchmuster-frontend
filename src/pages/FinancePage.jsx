import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CreditCard,
  Download,
  LockKeyhole,
  ReceiptText,
  Trash2,
  WalletCards,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import Navbar from '../components/Navbar'
import API_URL from '../config/api'
import {
  clearAuthToken,
  getAuthToken,
} from '../utils/authStorage'
import './FinancePage.css'
import './FinancePage.mobile.css'

const INCOME_CATEGORIES = [
  'Sponsorship',
  'Fundraising',
  'Prize money',
  'Other income',
]
const EXPENSE_CATEGORIES = [
  'Pitch hire',
  'Referee fees',
  'Equipment',
  'League fees',
  'Travel',
  'Insurance',
  'Other expense',
]

function currency(pence) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(Number(pence || 0) / 100)
}

function displayDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function defaultDate() {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

function escapeCsv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function FinancePage({ analytics = false }) {
  const navigate = useNavigate()
  const { teamId } = useParams()
  const [currentUser, setCurrentUser] = useState(null)
  const [team, setTeam] = useState(null)
  const [finance, setFinance] = useState(null)
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    entry_type: 'expense',
    category: EXPENSE_CATEGORIES[0],
    description: '',
    amount: '',
    occurred_on: defaultDate(),
  })

  const redirectToLogin = useCallback(async () => {
    await clearAuthToken()
    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')
    navigate('/login', { replace: true })
  }, [navigate])

  const authHeaders = useCallback(() => {
    const token = getAuthToken()
    if (!token) return null
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: token,
    }
  }, [])

  const loadFinance = useCallback(async () => {
    const headers = authHeaders()
    if (!headers) {
      await redirectToLogin()
      return
    }

    setLoading(true)
    setError('')

    try {
      const [userResponse, teamsResponse, financeResponse] = await Promise.all([
        fetch(`${API_URL}/users/me`, { headers }),
        fetch(`${API_URL}/teams`, { headers }),
        fetch(
          `${API_URL}/teams/${teamId}/finance${analytics ? '/analytics' : ''}`,
          { headers },
        ),
      ])

      if (
        userResponse.status === 401 ||
        teamsResponse.status === 401 ||
        financeResponse.status === 401
      ) {
        await redirectToLogin()
        return
      }

      const userData = await userResponse.json()
      const teamsData = await teamsResponse.json()
      const financeData = await financeResponse.json().catch(() => ({}))
      const teams = Array.isArray(teamsData) ? teamsData : teamsData.teams || []

      setCurrentUser(userData.user || userData)
      setTeam(
        teams.find((record) => String(record.id) === String(teamId)) || null,
      )

      if (financeResponse.status === 403 && financeData.code === 'plus_required') {
        setLocked(true)
        setFinance(null)
        return
      }

      if (financeResponse.status === 403) {
        navigate('/dashboard', { replace: true })
        return
      }

      if (!financeResponse.ok) {
        throw new Error(financeData.error || 'Unable to load club finances.')
      }

      setLocked(false)
      setFinance(financeData)
    } catch (requestError) {
      setError(requestError.message || 'Unable to load club finances.')
    } finally {
      setLoading(false)
    }
  }, [analytics, authHeaders, navigate, redirectToLogin, teamId])

  useEffect(() => {
    // The loader synchronises this route with the authenticated finance API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFinance()
  }, [loadFinance])

  const categories = useMemo(
    () =>
      form.entry_type === 'income'
        ? INCOME_CATEGORIES
        : EXPENSE_CATEGORIES,
    [form.entry_type],
  )

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function changeEntryType(entryType) {
    const next = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    setForm((current) => ({
      ...current,
      entry_type: entryType,
      category: next[0],
    }))
  }

  async function createEntry(event) {
    event.preventDefault()
    const amount = Number.parseFloat(form.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount greater than £0.')
      return
    }

    const headers = authHeaders()
    if (!headers) return

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/teams/${teamId}/finance_entries`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          team_finance_entry: {
            entry_type: form.entry_type,
            category: form.category,
            description: form.description.trim(),
            amount_pence: Math.round(amount * 100),
            occurred_on: form.occurred_on,
          },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          data.error || data.errors?.join(', ') || 'Unable to save this finance entry.',
        )
      }

      setForm({
        entry_type: 'expense',
        category: EXPENSE_CATEGORIES[0],
        description: '',
        amount: '',
        occurred_on: defaultDate(),
      })
      setShowForm(false)
      await loadFinance()
      window.dispatchEvent(new CustomEvent('matchmuster:finance-updated'))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(entry) {
    if (!window.confirm(`Delete “${entry.description}”?`)) return
    const headers = authHeaders()
    if (!headers) return

    setDeletingId(entry.id)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/finance_entries/${entry.id}`,
        { method: 'DELETE', headers },
      )
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Unable to delete this entry.')
      }
      await loadFinance()
      window.dispatchEvent(new CustomEvent('matchmuster:finance-updated'))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function exportCsv() {
    const rows = [
      ['Date', 'Type', 'Description', 'Category', 'Amount GBP'],
      ...(finance?.match_subs || []).map((row) => [
        row.occurred_on,
        'Income',
        `Match Subs vs ${row.opponent}`,
        'Match Subs',
        (Number(row.amount_pence || 0) / 100).toFixed(2),
      ]),
      ...(finance?.entries || []).map((entry) => [
        entry.occurred_on,
        entry.entry_type === 'income' ? 'Income' : 'Expense',
        entry.description,
        entry.category,
        `${entry.entry_type === 'expense' ? '-' : ''}${(
          Number(entry.amount_pence || 0) / 100
        ).toFixed(2)}`,
      ]),
    ]
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
    const fileName = `${team?.name || 'club'}-finance.csv`
    const file = new File([csv], fileName, {
      type: 'text/csv;charset=utf-8',
    })

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${team?.name || 'Club'} finance statement`,
        })
      } catch (shareError) {
        if (shareError.name !== 'AbortError') {
          setError('The finance statement could not be shared.')
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

  if (loading) {
    return <p className="dashboard-message">Loading club finances...</p>
  }

  const ownerCanUpgrade =
    team?.multi_team_access?.owned_by_current_manager === true

  if (locked) {
    return (
      <>
        <Navbar teamId={teamId} currentUser={currentUser} />
        <main className="finance-page">
          <section className="finance-shell">
            <section className="finance-locked-card">
              <span><LockKeyhole size={28} aria-hidden="true" /></span>
              <p>MATCHMUSTER PLUS</p>
              <h1 className="mm-page-title">Finance analytics</h1>
              <p>
                Unlock charts, trends, payment analysis, statements and CSV exports.
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

  const summary = finance?.summary || {}
  const position = summary.position || 'break_even'
  const expenseEntries = (finance?.entries || []).filter(
    (entry) => entry.entry_type === 'expense',
  )
  const currentMonth = defaultDate().slice(0, 7)
  const currentMonthSpent = expenseEntries
    .filter((entry) => String(entry.occurred_on || '').startsWith(currentMonth))
    .reduce((total, entry) => total + Number(entry.amount_pence || 0), 0)
  const expenseCategoryTotals = Object.entries(
    expenseEntries.reduce((totals, entry) => {
      const name = entry.category || 'Uncategorised'
      totals[name] = (totals[name] || 0) + Number(entry.amount_pence || 0)
      return totals
    }, {}),
  )
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
  const topExpenseCategory = expenseCategoryTotals[0]
  const highestCategoryAmount = topExpenseCategory?.amount || 0

  return (
    <>
      <Navbar teamId={teamId} currentUser={currentUser} />
      <main className="finance-page">
        <section className="finance-shell">
          <header className="finance-heading">
            <div>
              <span>{analytics ? 'MANAGER • PLUS' : 'MANAGER • CLUB FINANCE'}</span>
              <h1 className="mm-page-title">
                {analytics ? 'Finance analytics' : 'Club finances'}
              </h1>
              {analytics && (
                <p>
                  Understand income, expenses and player payment collection in one place.
                </p>
              )}
            </div>
            {analytics && (
              <div className="finance-heading-actions">
                <button
                  className="finance-view-expenses-button"
                  type="button"
                  onClick={() => void exportCsv()}
                >
                  <Download size={19} aria-hidden="true" />
                  Export CSV
                </button>
                <button
                  className="finance-view-expenses-button"
                  type="button"
                  onClick={() => navigate(`/teams/${teamId}/finance/expenses`)}
                >
                  <ReceiptText size={19} aria-hidden="true" />
                  Expenses
                </button>
                <button
                  className="finance-view-expenses-button"
                  type="button"
                  onClick={() => navigate(`/teams/${teamId}/payments`)}
                >
                  <CreditCard size={19} aria-hidden="true" />
                  Plus payments
                </button>
              </div>
            )}
          </header>

          {error && <p className="finance-error" role="alert">{error}</p>}

          {!analytics && (
            <button
              className="finance-analytics-button"
              type="button"
              onClick={() => navigate(`/teams/${teamId}/finance/analytics`)}
            >
              <BarChart3 aria-hidden="true" />
              <span>Show Finance Analytics</span>
              <small>PLUS</small>
            </button>
          )}

          <section className={`finance-position-card ${position}`}>
            <div>
              <span className="finance-position-icon">
                <WalletCards size={24} aria-hidden="true" />
              </span>
              <span>
                <small>Current position</small>
                <strong>
                  {position === 'surplus'
                    ? 'Surplus'
                    : position === 'deficit'
                      ? 'Deficit'
                      : 'Break-even'}
                </strong>
              </span>
            </div>
            <strong className="finance-position-value">
              {currency(summary.balance_pence)}
            </strong>
          </section>

          <section className="finance-summary-grid">
            <article>
              <span>Total income</span>
              <strong>{currency(summary.total_income_pence)}</strong>
              <small>Includes Match Subs</small>
            </article>
            <article>
              <span>Match Subs</span>
              <strong>{currency(summary.match_sub_income_pence)}</strong>
              <small>Stripe-confirmed payments</small>
            </article>
            <article>
              <span>Expenses</span>
              <strong>{currency(summary.total_expenses_pence)}</strong>
              <small>Recorded club costs</small>
            </article>
          </section>

          {analytics && <section className="finance-insights-grid" aria-label="Finance insights">
            <article>
              <span className="finance-insight-icon"><CalendarDays size={20} aria-hidden="true" /></span>
              <div><small>Spent this month</small><strong>{currency(currentMonthSpent)}</strong><p>Recorded costs during the current calendar month.</p></div>
            </article>
            <article>
              <span className="finance-insight-icon"><BarChart3 size={20} aria-hidden="true" /></span>
              <div><small>Biggest cost area</small><strong>{topExpenseCategory?.name || 'No costs yet'}</strong><p>{topExpenseCategory ? `${currency(topExpenseCategory.amount)} spent in this category.` : 'Record expenses to reveal spending patterns.'}</p></div>
            </article>
          </section>}

          {analytics && <section className="finance-spending-overview">
            <div className="finance-section-heading finance-spending-heading">
              <div>
                <span>SPENDING INTELLIGENCE</span>
                <h2>Expense breakdown</h2>
                <p>See which parts of the club use the most money.</p>
              </div>
              <button type="button" onClick={() => navigate(`/teams/${teamId}/finance/expenses`)}>
                Full expense statement <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
            {expenseCategoryTotals.length > 0 ? (
              <div className="finance-overview-bars">
                {expenseCategoryTotals.slice(0, 5).map((item) => (
                  <div className="finance-overview-bar" key={item.name}>
                    <div><strong>{item.name}</strong><span>{currency(item.amount)}</span></div>
                    <div><span style={{ width: `${Math.max(5, (item.amount / highestCategoryAmount) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="finance-overview-empty">Add an expense to start seeing where the club spends the most.</p>
            )}
          </section>}

          <button
            className="finance-entry-button"
            type="button"
            onClick={() => setShowForm((current) => !current)}
          >
            Add entry
          </button>

          {showForm && (
            <form className="finance-entry-form" onSubmit={createEntry}>
              <div className="finance-entry-type">
                <button
                  className={form.entry_type === 'income' ? 'active income' : ''}
                  type="button"
                  onClick={() => changeEntryType('income')}
                >
                  Income
                </button>
                <button
                  className={form.entry_type === 'expense' ? 'active expense' : ''}
                  type="button"
                  onClick={() => changeEntryType('expense')}
                >
                  Expense
                </button>
              </div>

              <div className="finance-form-grid">
                <label>
                  <span>Category</span>
                  <select
                    value={form.category}
                    onChange={(event) => updateForm('category', event.target.value)}
                  >
                    {categories.map((category) => (
                      <option value={category} key={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Amount (£)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(event) => updateForm('amount', event.target.value)}
                    placeholder="0.00"
                    required
                  />
                </label>
                <label>
                  <span>Date</span>
                  <span className="finance-date-control">
                    <input
                      type="date"
                      value={form.occurred_on}
                      onChange={(event) => updateForm('occurred_on', event.target.value)}
                      required
                    />
                  </span>
                </label>
                <label className="finance-description-field">
                  <span>Description</span>
                  <input
                    type="text"
                    maxLength="180"
                    value={form.description}
                    onChange={(event) => updateForm('description', event.target.value)}
                    placeholder={
                      form.entry_type === 'expense'
                        ? 'e.g. Pitch hire'
                        : 'e.g. Local sponsor'
                    }
                    required
                  />
                </label>
              </div>

              <div className="finance-form-actions">
                <button className="finance-save-button" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save entry'}
                </button>
                <button className="finance-cancel-button" type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <section className="finance-ledger-section">
            <div className="finance-section-heading">
              <div>
                <span>LEDGER</span>
                <h2>{analytics ? 'Income & expenses' : 'Recent activity'}</h2>
              </div>
            </div>

            <div className="finance-ledger">
              {finance?.match_subs?.slice(0, analytics ? undefined : 3).map((row) => (
                <article className="finance-ledger-row income automatic" key={`match-${row.match_id}`}>
                  <span className="finance-ledger-icon"><ArrowUpRight size={18} aria-hidden="true" /></span>
                  <span className="finance-ledger-copy">
                    <strong>Match Subs vs {row.opponent}</strong>
                    <small>{displayDate(row.occurred_on)} • {row.payments_received} paid</small>
                  </span>
                  <strong className="finance-ledger-amount">+{currency(row.amount_pence)}</strong>
                </article>
              ))}

              {finance?.entries?.slice(0, analytics ? undefined : 5).map((entry) => {
                const income = entry.entry_type === 'income'
                return (
                  <article className={`finance-ledger-row ${income ? 'income' : 'expense'}`} key={entry.id}>
                    <span className="finance-ledger-icon">
                      {income
                        ? <ArrowUpRight size={18} aria-hidden="true" />
                        : <ArrowDownRight size={18} aria-hidden="true" />}
                    </span>
                    <span className="finance-ledger-copy">
                      <strong>{entry.description}</strong>
                      <small>{entry.category} • {displayDate(entry.occurred_on)}</small>
                    </span>
                    <strong className="finance-ledger-amount">
                      {income ? '+' : '-'}{currency(entry.amount_pence)}
                    </strong>
                    <button
                      className="finance-delete-button"
                      type="button"
                      disabled={deletingId === entry.id}
                      onClick={() => void deleteEntry(entry)}
                      aria-label={`Delete ${entry.description}`}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </article>
                )
              })}

              {(finance?.entries?.length || 0) === 0 &&
                (finance?.match_subs?.length || 0) === 0 && (
                  <div className="finance-ledger-empty">
                    No finance activity yet. Add your first income or expense.
                  </div>
                )}
            </div>
          </section>
        </section>
      </main>
    </>
  )
}

export default FinancePage
