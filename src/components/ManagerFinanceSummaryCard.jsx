import { ArrowRight, LockKeyhole, WalletCards } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import API_URL from '../config/api'
import { getAuthToken } from '../utils/authStorage'
import './ManagerFinanceSummaryCard.css'

function currency(pence) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(Number(pence || 0) / 100)
}

function positionLabel(position) {
  if (position === 'surplus') return 'Surplus'
  if (position === 'deficit') return 'Deficit'
  return 'Break-even'
}

function ManagerFinanceSummaryCard({ teamId, team }) {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadFinance = useCallback(async () => {
    if (!teamId) return
    const token = getAuthToken()
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/teams/${teamId}/finance`, {
        headers: {
          Accept: 'application/json',
          Authorization: token,
        },
      })
      const data = await response.json().catch(() => ({}))

      if (response.status === 403 && data.code === 'plus_required') {
        setLocked(true)
        setSummary(null)
        return
      }

      if (!response.ok) return
      setLocked(false)
      setSummary(data.summary || null)
    } catch {
      // Supplementary card; dashboard remains usable.
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    void loadFinance()
    const updated = () => void loadFinance()
    window.addEventListener('matchmuster:finance-updated', updated)
    return () =>
      window.removeEventListener('matchmuster:finance-updated', updated)
  }, [loadFinance])

  if (loading) return null

  const ownerCanUpgrade =
    team?.multi_team_access?.owned_by_current_manager === true

  if (locked) {
    return (
      <section className="manager-finance-card locked">
        <div className="manager-finance-card-top">
          <span className="manager-finance-icon">
            <LockKeyhole size={20} aria-hidden="true" />
          </span>
          <div>
            <span>MATCHMUSTER PLUS</span>
            <h2>Club finances</h2>
            <p>Track income, expenses and Match Subs in one place.</p>
          </div>
        </div>

        {ownerCanUpgrade && (
          <button
            type="button"
            onClick={() => navigate(`/teams/${teamId}/subscription`)}
          >
            View Plus
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
      </section>
    )
  }

  if (!summary) return null
  const position = summary.position || 'break_even'

  return (
    <section className="manager-finance-card">
      <div className="manager-finance-card-top">
        <span className="manager-finance-icon">
          <WalletCards size={20} aria-hidden="true" />
        </span>
        <div>
          <span>CLUB FINANCES</span>
          <h2>Financial position</h2>
          <p>Match Subs plus your recorded income and expenses.</p>
        </div>
        <span className={`manager-finance-position ${position}`}>
          {positionLabel(position)}
        </span>
      </div>

      <div className="manager-finance-metrics">
        <article>
          <span>Income</span>
          <strong>{currency(summary.total_income_pence)}</strong>
        </article>
        <article>
          <span>Expenses</span>
          <strong>{currency(summary.total_expenses_pence)}</strong>
        </article>
        <article className={`manager-finance-balance ${position}`}>
          <span>Balance</span>
          <strong>{currency(summary.balance_pence)}</strong>
        </article>
      </div>

      <button
        className="manager-finance-open"
        type="button"
        onClick={() => navigate(`/teams/${teamId}/finance`)}
      >
        Open club finances
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </section>
  )
}

export default ManagerFinanceSummaryCard
