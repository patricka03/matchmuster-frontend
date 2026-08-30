import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  BarChart3,
  CalendarCheck,
  HeartPulse,
  LockKeyhole,
  Pencil,
  Search,
  ShieldCheck,
  TrendingUp,
  UserMinus,
  Users,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import Navbar from '../components/Navbar'
import API_URL from '../config/api'
import { clearAuthToken, getAuthToken } from '../utils/authStorage'
import './SquadAnalyticsPage.css'

const EMPTY_ANALYTICS = {
  overview: {},
  fitness: [],
  player_metrics: [],
  impact_leaders: [],
  reliability_leaders: [],
  dropout_leaders: [],
  partnerships: [],
}

function playerName(player) {
  return player?.name || [player?.first_name, player?.last_name].filter(Boolean).join(' ') || 'Player'
}

function percentage(value) {
  return `${Number(value || 0).toFixed(Number(value || 0) % 1 ? 1 : 0)}%`
}

function prettyStatus(status) {
  return status ? status[0].toUpperCase() + status.slice(1) : 'Fit'
}

function SquadAnalyticsPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()
  const [currentUser, setCurrentUser] = useState(null)
  const [team, setTeam] = useState(null)
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS)
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('appearances')
  const [fitnessForm, setFitnessForm] = useState({
    userId: '', status: 'fit', expectedReturnOn: '', note: '',
  })
  const fitnessFormRef = useRef(null)

  const redirectToLogin = useCallback(async () => {
    await clearAuthToken()
    localStorage.removeItem('currentUser')
    localStorage.removeItem('activeTeamId')
    localStorage.removeItem('activeTeamName')
    navigate('/login', { replace: true })
  }, [navigate])

  const loadAnalytics = useCallback(async () => {
    const token = getAuthToken()
    if (!token) return redirectToLogin()

    setError('')
    const headers = { Accept: 'application/json', Authorization: token }
    try {
      const [userResponse, teamResponse, analyticsResponse] = await Promise.all([
        fetch(`${API_URL}/users/me`, { headers }),
        fetch(`${API_URL}/teams/${teamId}`, { headers }),
        fetch(`${API_URL}/teams/${teamId}/squad_analytics`, { headers }),
      ])
      if ([userResponse, teamResponse, analyticsResponse].some((response) => response.status === 401)) {
        return redirectToLogin()
      }

      const [userData, teamData, analyticsData] = await Promise.all([
        userResponse.json().catch(() => ({})),
        teamResponse.json().catch(() => ({})),
        analyticsResponse.json().catch(() => ({})),
      ])
      setCurrentUser(userData.user || userData)
      setTeam(teamData.team || teamData)

      if (analyticsResponse.status === 403 && analyticsData.code === 'plus_required') {
        setLocked(true)
        return
      }
      if (analyticsResponse.status === 403) {
        navigate(`/teams/${teamId}/squad`, { replace: true })
        return
      }
      if (analyticsResponse.status === 404) {
        throw new Error('Squad analytics could not be loaded. Please update the MatchMuster backend and try again.')
      }
      if (!analyticsResponse.ok) throw new Error(analyticsData.error || 'Unable to load squad analytics.')

      setLocked(false)
      setAnalytics({ ...EMPTY_ANALYTICS, ...analyticsData })
    } catch (requestError) {
      setError(requestError.message || 'Unable to load squad analytics.')
    } finally {
      setLoading(false)
    }
  }, [navigate, redirectToLogin, teamId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadAnalytics() }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadAnalytics])

  const fitnessByPlayer = useMemo(() => new Map(
    analytics.fitness.map((item) => [String(item.player.id), item]),
  ), [analytics.fitness])

  const filteredPlayers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = analytics.player_metrics.filter((row) => [
      playerName(row.player), row.player?.preferred_position,
    ].join(' ').toLowerCase().includes(needle))
    return [...rows].sort((a, b) => {
      if (sort === 'impact') return Number(b.win_rate_difference ?? -999) - Number(a.win_rate_difference ?? -999)
      if (sort === 'reliability') return Number(b.availability_rate) - Number(a.availability_rate)
      if (sort === 'dropouts') return Number(b.selected_dropouts) - Number(a.selected_dropouts)
      return Number(b.appearances) - Number(a.appearances)
    })
  }, [analytics.player_metrics, query, sort])

  function selectFitnessPlayer(userId) {
    const existing = fitnessByPlayer.get(String(userId))
    setFitnessForm({
      userId,
      status: existing?.status || 'fit',
      expectedReturnOn: existing?.expected_return_on || '',
      note: existing?.note || '',
    })
  }

  function editFitness(item) {
    setFitnessForm({
      userId: String(item.player.id),
      status: item.status || 'fit',
      expectedReturnOn: item.expected_return_on || '',
      note: item.note || '',
    })

    window.requestAnimationFrame(() => {
      fitnessFormRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
  }

  async function saveFitness(event) {
    event.preventDefault()
    if (!fitnessForm.userId) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/player_fitness_statuses/${fitnessForm.userId}`,
        {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: getAuthToken(),
          },
          body: JSON.stringify({
            player_fitness_status: {
              status: fitnessForm.status,
              note: fitnessForm.note,
              expected_return_on: fitnessForm.expectedReturnOn || null,
            },
          }),
        },
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || data.errors?.join(', ') || 'Unable to save fitness status.')
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      await loadAnalytics()
    } catch (requestError) {
      setError(requestError.message || 'Unable to save fitness status.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="dashboard-message">Loading squad analytics...</p>

  const ownerId = team?.owner_user_id || team?.owner_id || team?.created_by_id || team?.manager_id
  const canManagePlan = !ownerId || String(ownerId) === String(currentUser?.id)
  const overview = analytics.overview

  return (
    <>
      <Navbar teamId={teamId} currentUser={currentUser} />
      <main className="squad-analytics-page">
        <div className="squad-analytics-shell">
          {locked ? (
            <section className="squad-analytics-lock">
              <LockKeyhole aria-hidden="true" />
              <span>MANAGER · PLUS</span>
              <h1>Know which players move your team forward</h1>
              <p>Turn match results and availability replies into practical squad decisions. See player impact, reliability, withdrawals, fitness and winning partnerships in one place.</p>
              <div className="squad-lock-preview" aria-label="Squad analytics preview">
                <article><TrendingUp /><strong>Player impact</strong><small>Wins when selected</small></article>
                <article><CalendarCheck /><strong>Reliability</strong><small>Availability response rate</small></article>
                <article><HeartPulse /><strong>Squad health</strong><small>Injuries and return dates</small></article>
                <article><Users /><strong>Partnerships</strong><small>Winning combinations</small></article>
              </div>
              {canManagePlan ? (
                <button type="button" onClick={() => navigate(`/teams/${teamId}/subscription`, { state: { requestedFeature: 'squad_analytics' } })}>Unlock Squad Analytics</button>
              ) : (
                <p className="squad-lock-owner-note">Ask the team owner to upgrade this club to MatchMuster Plus.</p>
              )}
            </section>
          ) : (
            <>
              <header className="squad-analytics-heading">
                <div>
                  <span>MANAGER · PLUS</span>
                  <h1>Squad analytics</h1>
                </div>
              </header>

              {error && <p className="squad-analytics-error" role="alert">{error}</p>}

              <section className="squad-overview-grid" aria-label="Squad overview">
                <article><Users /><span>Squad players</span><strong>{overview.players || 0}</strong><small>Approved players</small></article>
                <article><BarChart3 /><span>Completed games</span><strong>{overview.completed_matches || 0}</strong><small>{overview.team_wins || 0} wins · {overview.team_draws || 0} draws</small></article>
                <article><TrendingUp /><span>Team win rate</span><strong>{percentage(overview.team_win_rate)}</strong><small>From scored matches</small></article>
                <article><HeartPulse /><span>Fitness concerns</span><strong>{overview.injured_or_unavailable || 0}</strong><small>Injured, doubtful or recovering</small></article>
              </section>

              <section className="squad-analytics-card squad-fitness-card">
                <div className="squad-section-title">
                  <div><span>SQUAD HEALTH</span><h2>Fitness & injuries</h2></div>
                  <HeartPulse aria-hidden="true" />
                </div>
                <form ref={fitnessFormRef} className="squad-fitness-form" onSubmit={saveFitness}>
                  <label>Player<select required value={fitnessForm.userId} onChange={(event) => selectFitnessPlayer(event.target.value)}><option value="">Select player</option>{analytics.player_metrics.map((row) => <option key={row.player.id} value={row.player.id}>{playerName(row.player)}</option>)}</select></label>
                  <label>Status<select value={fitnessForm.status} onChange={(event) => setFitnessForm((form) => ({ ...form, status: event.target.value }))}><option value="fit">Fit</option><option value="doubtful">Doubtful</option><option value="injured">Injured</option><option value="recovering">Recovering</option></select></label>
                  <label>Expected return<input type="date" value={fitnessForm.expectedReturnOn} onChange={(event) => setFitnessForm((form) => ({ ...form, expectedReturnOn: event.target.value }))} /></label>
                  <label className="squad-fitness-note">Note<input maxLength="160" placeholder="Optional manager note" value={fitnessForm.note} onChange={(event) => setFitnessForm((form) => ({ ...form, note: event.target.value }))} /></label>
                  <button type="submit" disabled={!fitnessForm.userId || saving}>{saving ? 'Saving...' : fitnessByPlayer.has(String(fitnessForm.userId)) ? 'Save changes' : 'Save status'}</button>
                </form>
                <div className="squad-fitness-list">
                  {analytics.fitness.length ? analytics.fitness.map((item) => (
                    <article key={item.id}>
                      <span className={`fitness-status ${item.status}`}>{prettyStatus(item.status)}</span>
                      <strong>{playerName(item.player)}</strong>
                      <small>{item.note || 'No note'}{item.expected_return_on ? ` · Expected ${new Date(`${item.expected_return_on}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}</small>
                      <button type="button" onClick={() => editFitness(item)} aria-label={`Edit fitness status for ${playerName(item.player)}`}>
                        <Pencil aria-hidden="true" />
                        Edit
                      </button>
                    </article>
                  )) : <p>Everyone is currently marked fit.</p>}
                </div>
              </section>

              <div className="squad-insight-grid">
                <section className="squad-analytics-card">
                  <div className="squad-section-title"><div><span>SELECTION IMPACT</span><h2>Winning influence</h2></div><TrendingUp /></div>
                  <p className="squad-card-intro">Players need at least {analytics.minimum_sample || 3} completed selections to rank.</p>
                  <div className="squad-ranking-list">
                    {analytics.impact_leaders.slice(0, 5).map((row, index) => <article key={row.player.id}><b>{index + 1}</b><span><strong>{playerName(row.player)}</strong><small>{row.wins}/{row.appearances} wins when selected</small></span><em className={row.win_rate_difference >= 0 ? 'positive' : 'negative'}>{row.win_rate_difference >= 0 ? '+' : ''}{percentage(row.win_rate_difference)} vs team</em></article>)}
                    {!analytics.impact_leaders.length && <p>Complete more scored matches to reveal player impact.</p>}
                  </div>
                </section>

                <section className="squad-analytics-card">
                  <div className="squad-section-title"><div><span>AVAILABILITY</span><h2>Most reliable</h2></div><ShieldCheck /></div>
                  <p className="squad-card-intro">Based on responses received, not assumptions.</p>
                  <div className="squad-ranking-list">
                    {analytics.reliability_leaders.slice(0, 5).map((row, index) => <article key={row.player.id}><b>{index + 1}</b><span><strong>{playerName(row.player)}</strong><small>{row.available_count} available from {row.availability_responses} replies</small></span><em>{percentage(row.availability_rate)}</em></article>)}
                    {!analytics.reliability_leaders.length && <p>Availability replies will build this ranking.</p>}
                  </div>
                </section>

                <section className="squad-analytics-card">
                  <div className="squad-section-title"><div><span>WITHDRAWALS</span><h2>Selected dropouts</h2></div><UserMinus /></div>
                  <p className="squad-card-intro">Counts players who changed from available to unavailable after selection.</p>
                  <div className="squad-ranking-list dropout">
                    {analytics.dropout_leaders.slice(0, 5).map((row, index) => <article key={row.player.id}><b>{index + 1}</b><span><strong>{playerName(row.player)}</strong><small>Selected-player withdrawals</small></span><em>{row.selected_dropouts}</em></article>)}
                    {!analytics.dropout_leaders.length && <p>No selected-player withdrawals recorded.</p>}
                  </div>
                </section>

                <section className="squad-analytics-card">
                  <div className="squad-section-title"><div><span>COMBINATIONS</span><h2>Winning partnerships</h2></div><Users /></div>
                  <p className="squad-card-intro">Players selected together in at least {analytics.minimum_sample || 3} completed games.</p>
                  <div className="squad-ranking-list">
                    {analytics.partnerships.slice(0, 5).map((row, index) => <article key={row.players.map((player) => player.id).join('-')}><b>{index + 1}</b><span><strong>{row.players.map(playerName).join(' & ')}</strong><small>{row.wins}/{row.played} wins together</small></span><em>{percentage(row.win_rate)}</em></article>)}
                    {!analytics.partnerships.length && <p>More shared selections are needed to rank partnerships.</p>}
                  </div>
                </section>
              </div>

              <section className="squad-analytics-card squad-player-table-card">
                <div className="squad-section-title"><div><span>PLAYER VIEW</span><h2>All player metrics</h2></div><Activity /></div>
                <div className="squad-player-filters">
                  <label><Search /><input type="search" placeholder="Search player or position" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
                  <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="appearances">Most appearances</option><option value="impact">Highest impact</option><option value="reliability">Most reliable</option><option value="dropouts">Most dropouts</option></select>
                </div>
                <div className="squad-player-table">
                  <div className="squad-player-head"><span>Player</span><span>Record</span><span>Win rate</span><span>Availability</span><span>Dropouts</span></div>
                  {filteredPlayers.map((row) => <article key={row.player.id}><span><strong>{playerName(row.player)}</strong><small>{row.player.preferred_position || 'Position not set'}</small></span><span>{row.wins}W · {row.draws}D · {row.losses}L</span><span>{percentage(row.win_rate)}</span><span>{row.availability_responses ? percentage(row.availability_rate) : 'No replies'}</span><b>{row.selected_dropouts}</b></article>)}
                  {!filteredPlayers.length && <p className="squad-player-empty">No players match this search.</p>}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  )
}

export default SquadAnalyticsPage
