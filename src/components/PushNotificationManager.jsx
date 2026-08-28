import {
  useEffect,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  Capacitor,
} from '@capacitor/core'

import {
  PushNotifications,
} from '@capacitor/push-notifications'

import {
  AUTH_CHANGED_EVENT,
  getAuthToken,
} from '../utils/authStorage'

import {
  initialisePushNotificationListeners,
  registerForPushNotifications,
} from '../utils/pushNotifications'

function pushNotificationRoute(
  data = {},
) {
  const type =
    data.notification_type

  const teamId =
    data.team_id

  const matchId =
    data.match_id

  const postId =
    data.post_id

  const trainingId =
    data.training_id

  if (
    [
      'fixture_created',
      'availability_required',
      'availability_reminder',
    ].includes(type) &&
    teamId &&
    matchId
  ) {
    return (
      `/teams/${teamId}/matches/${matchId}/availabilities/confirm`
    )
  }

  if (
    [
      'squad_selected',
      'squad_updated',
      'squad_selection_reminder',
      'squad_selection_reminder',
    ].includes(type) &&
    teamId &&
    matchId
  ) {
    return (
      `/teams/${teamId}/matches/${matchId}/squad`
    )
  }

  if (
    [
      'motm_voting_open',
      'match_rating_open',
      'match_rating_reminder',
      'motm_announced',
      'man_of_the_match',
      'match_rating_result',
    ].includes(type) &&
    teamId &&
    matchId
  ) {
    return (
      `/teams/${teamId}/matches/${matchId}/ratings`
    )
  }

  if (
    [
      'match_payment_requested',
      'match_payment_amount_changed',
      'match_payment_reminder',
      'match_payment_paid',
      'match_payment_waived',
    ].includes(type) &&
    teamId &&
    matchId
  ) {
    return (
      `/teams/${teamId}/matches/${matchId}/payments`
    )
  }

  if (
    [
      'announcement',
      'tactical_post',
      'post_created',
    ].includes(type) &&
    teamId &&
    postId
  ) {
    return (
      `/teams/${teamId}/posts/${postId}`
    )
  }

  if (
    [
      'fixture_updated',
      'fixture_cancelled',
      'player_availability_updated',
      'match_kickoff_reminder',
      'match_started',
      'match_kickoff_reminder',
      'match_started',
    ].includes(type) &&
    teamId &&
    matchId
  ) {
    return (
      `/teams/${teamId}/matches/${matchId}`
    )
  }

  if (
    [
      'training_availability_reminder',
      'training_availability_updated',
      'training_start_reminder',
      'training_started',
      'training_start_reminder',
      'training_started',
    ].includes(type) &&
    teamId &&
    trainingId
  ) {
    return (
      `/teams/${teamId}/trainings/${trainingId}`
    )
  }

  if (
    [
      'join_request_received',
      'team_join_requested',
      'player_joined',
    ].includes(type) &&
    teamId
  ) {
    return (
      `/teams/${teamId}/squad`
    )
  }

  if (
    [
      'membership_approved',
      'membership_rejected',
      'team_join_approved',
      'team_join_rejected',
      'team_membership_removed',
      'team_updated',
      'manager_status_updated',
    ].includes(type)
  ) {
    return '/dashboard'
  }

  return '/notifications'
}

function PushNotificationManager() {
  const navigate =
    useNavigate()

  useEffect(() => {
    let cleanup = null
    let cancelled = false

    async function attemptRegistration() {
      const token =
        getAuthToken()

      if (!token || cancelled) {
        return
      }

      if (
        !Capacitor.isNativePlatform()
      ) {
        return
      }

      const permission =
        await PushNotifications
          .checkPermissions()

      if (
        permission.receive !==
        'granted'
      ) {
        return
      }

      await registerForPushNotifications()
    }

    async function initialisePushNotifications() {
      cleanup =
        await initialisePushNotificationListeners({
          onNotificationOpened:
            (notification) => {
              /*
               * Apple first:
               * do not change Android tap
               * behaviour during the iOS
               * launch phase.
               */
              if (
                Capacitor.getPlatform() !==
                'ios'
              ) {
                return
              }

              navigate(
                pushNotificationRoute(
                  notification?.data || {},
                ),
              )
            },
        })

      if (cancelled) {
        await cleanup()
        return
      }

      await attemptRegistration()
    }

    function handleAuthChanged() {
      void attemptRegistration().catch(
        (error) => {
          console.error(
            'Unable to register MatchMuster push notifications after authentication changed.',
            error,
          )
        },
      )
    }

    window.addEventListener(
      AUTH_CHANGED_EVENT,
      handleAuthChanged,
    )

    initialisePushNotifications().catch(
      (error) => {
        console.error(
          'Unable to initialise MatchMuster push notifications.',
          error,
        )
      },
    )

    return () => {
      cancelled = true

      window.removeEventListener(
        AUTH_CHANGED_EVENT,
        handleAuthChanged,
      )

      if (cleanup) {
        void cleanup()
      }
    }
  }, [navigate])

  return null
}

export default PushNotificationManager
