import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import API_URL from '../config/api'
import { getAuthToken } from '../utils/authStorage'

const MATCHDAY_LIVE_DURATION_MS = 2 * 60 * 60 * 1000

function isMatchdayLiveOpen(match, reportingOpen, now = Date.now()) {
  if (!reportingOpen || !match?.kickoff_time) return false

  const kickoffTimestamp = new Date(match.kickoff_time).getTime()

  if (!Number.isFinite(kickoffTimestamp)) return false

  return now < kickoffTimestamp + MATCHDAY_LIVE_DURATION_MS
}

function useMatchdayLateStatuses(teamId) {
  const [match, setMatch] = useState(null)
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!teamId) {
      setMatch(null)
      setStatuses([])
      return
    }

    const token = getAuthToken()
    if (!token) return

    setLoading(true)

    try {
      const response = await fetch(
        `${API_URL}/teams/${teamId}/matchday/late_statuses`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: token,
          },
        },
      )

      if (!response.ok) return

      const data = await response.json()
      const reportingOpen = isMatchdayLiveOpen(
        data.match,
        data.reporting_open === true,
      )

      setMatch(reportingOpen ? data.match || null : null)
      setStatuses(
        reportingOpen && Array.isArray(data.statuses)
          ? data.statuses
          : [],
      )
    } catch {
      // Running Late is supplementary and must never break the page.
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refresh()
    }, 0)

    const interval = window.setInterval(refresh, 30000)

    const handleUpdated = () => {
      void refresh()
    }

    window.addEventListener(
      'matchmuster:late-status-updated',
      handleUpdated,
    )

    return () => {
      window.clearTimeout(initialRefresh)
      window.clearInterval(interval)
      window.removeEventListener(
        'matchmuster:late-status-updated',
        handleUpdated,
      )
    }
  }, [refresh])

  const statusesByUser = useMemo(() => {
    const result = new Map()

    statuses.forEach((status) => {
      result.set(String(status.user_id), status)
    })

    return result
  }, [statuses])

  return {
    loading,
    match,
    statuses,
    statusesByUser,
    refresh,
  }
}

export default useMatchdayLateStatuses
