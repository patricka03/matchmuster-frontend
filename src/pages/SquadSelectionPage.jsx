import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import '../styles/SquadSelectionPage.css'
import API_URL from '../config/api'

const benchPositions = [
  'GK',
  'CB',
  'LB',
  'RB',
  'LWB',
  'RWB',
  'CDM',
  'CM',
  'CAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'CF',
  'ST',
]

function pitchSlot(id, position) {
  return { id, position }
}

// Rows run from attack at the top to goalkeeper at the bottom.
const formationLayouts = {
  '4-4-2': [
    [
      pitchSlot('left-st', 'ST'),
      pitchSlot('right-st', 'ST'),
    ],
    [
      pitchSlot('lm', 'LM'),
      pitchSlot('left-cm', 'CM'),
      pitchSlot('right-cm', 'CM'),
      pitchSlot('rm', 'RM'),
    ],
    [
      pitchSlot('lb', 'LB'),
      pitchSlot('left-cb', 'CB'),
      pitchSlot('right-cb', 'CB'),
      pitchSlot('rb', 'RB'),
    ],
    [pitchSlot('gk', 'GK')],
  ],

  '4-4-2 Diamond': [
    [
      pitchSlot('left-st', 'ST'),
      pitchSlot('right-st', 'ST'),
    ],
    [pitchSlot('cam', 'CAM')],
    [
      pitchSlot('left-cm', 'CM'),
      pitchSlot('right-cm', 'CM'),
    ],
    [pitchSlot('cdm', 'CDM')],
    [
      pitchSlot('lb', 'LB'),
      pitchSlot('left-cb', 'CB'),
      pitchSlot('right-cb', 'CB'),
      pitchSlot('rb', 'RB'),
    ],
    [pitchSlot('gk', 'GK')],
  ],

  '4-3-3': [
    [
      pitchSlot('lw', 'LW'),
      pitchSlot('st', 'ST'),
      pitchSlot('rw', 'RW'),
    ],
    [
      pitchSlot('left-cm', 'CM'),
      pitchSlot('cm', 'CM'),
      pitchSlot('right-cm', 'CM'),
    ],
    [
      pitchSlot('lb', 'LB'),
      pitchSlot('left-cb', 'CB'),
      pitchSlot('right-cb', 'CB'),
      pitchSlot('rb', 'RB'),
    ],
    [pitchSlot('gk', 'GK')],
  ],

  '4-2-3-1': [
    [pitchSlot('st', 'ST')],
    [
      pitchSlot('lw', 'LW'),
      pitchSlot('cam', 'CAM'),
      pitchSlot('rw', 'RW'),
    ],
    [
      pitchSlot('left-cdm', 'CDM'),
      pitchSlot('right-cdm', 'CDM'),
    ],
    [
      pitchSlot('lb', 'LB'),
      pitchSlot('left-cb', 'CB'),
      pitchSlot('right-cb', 'CB'),
      pitchSlot('rb', 'RB'),
    ],
    [pitchSlot('gk', 'GK')],
  ],

  '4-1-4-1': [
    [pitchSlot('st', 'ST')],
    [
      pitchSlot('lm', 'LM'),
      pitchSlot('left-cm', 'CM'),
      pitchSlot('right-cm', 'CM'),
      pitchSlot('rm', 'RM'),
    ],
    [pitchSlot('cdm', 'CDM')],
    [
      pitchSlot('lb', 'LB'),
      pitchSlot('left-cb', 'CB'),
      pitchSlot('right-cb', 'CB'),
      pitchSlot('rb', 'RB'),
    ],
    [pitchSlot('gk', 'GK')],
  ],

  '4-5-1': [
    [pitchSlot('st', 'ST')],
    [
      pitchSlot('lm', 'LM'),
      pitchSlot('left-cm', 'CM'),
      pitchSlot('cam', 'CAM'),
      pitchSlot('right-cm', 'CM'),
      pitchSlot('rm', 'RM'),
    ],
    [
      pitchSlot('lb', 'LB'),
      pitchSlot('left-cb', 'CB'),
      pitchSlot('right-cb', 'CB'),
      pitchSlot('rb', 'RB'),
    ],
    [pitchSlot('gk', 'GK')],
  ],

  '4-2-4': [
    [
      pitchSlot('lw', 'LW'),
      pitchSlot('left-st', 'ST'),
      pitchSlot('right-st', 'ST'),
      pitchSlot('rw', 'RW'),
    ],
    [
      pitchSlot('left-cm', 'CM'),
      pitchSlot('right-cm', 'CM'),
    ],
    [
      pitchSlot('lb', 'LB'),
      pitchSlot('left-cb', 'CB'),
      pitchSlot('right-cb', 'CB'),
      pitchSlot('rb', 'RB'),
    ],
    [pitchSlot('gk', 'GK')],
  ],

  '3-5-2': [
    [
      pitchSlot('left-st', 'ST'),
      pitchSlot('right-st', 'ST'),
    ],
    [
      pitchSlot('lwb', 'LWB'),
      pitchSlot('left-cm', 'CM'),
      pitchSlot('cam', 'CAM'),
      pitchSlot('right-cm', 'CM'),
      pitchSlot('rwb', 'RWB'),
    ],
    [
      pitchSlot('left-cb', 'CB'),
      pitchSlot('centre-cb', 'CB'),
      pitchSlot('right-cb', 'CB'),
    ],
    [pitchSlot('gk', 'GK')],
  ],

  '3-4-3': [
    [
      pitchSlot('lw', 'LW'),
      pitchSlot('st', 'ST'),
      pitchSlot('rw', 'RW'),
    ],
    [
      pitchSlot('lm', 'LM'),
      pitchSlot('left-cm', 'CM'),
      pitchSlot('right-cm', 'CM'),
      pitchSlot('rm', 'RM'),
    ],
    [
      pitchSlot('left-cb', 'CB'),
      pitchSlot('centre-cb', 'CB'),
      pitchSlot('right-cb', 'CB'),
    ],
    [pitchSlot('gk', 'GK')],
  ],

  '3-4-2-1': [
    [pitchSlot('st', 'ST')],
    [
      pitchSlot('left-cam', 'CAM'),
      pitchSlot('right-cam', 'CAM'),
    ],
    [
      pitchSlot('lm', 'LM'),
      pitchSlot('left-cm', 'CM'),
      pitchSlot('right-cm', 'CM'),
      pitchSlot('rm', 'RM'),
    ],
    [
      pitchSlot('left-cb', 'CB'),
      pitchSlot('centre-cb', 'CB'),
      pitchSlot('right-cb', 'CB'),
    ],
    [pitchSlot('gk', 'GK')],
  ],

  '3-1-4-2': [
    [
      pitchSlot('left-st', 'ST'),
      pitchSlot('right-st', 'ST'),
    ],
    [
      pitchSlot('lm', 'LM'),
      pitchSlot('left-cm', 'CM'),
      pitchSlot('right-cm', 'CM'),
      pitchSlot('rm', 'RM'),
    ],
    [pitchSlot('cdm', 'CDM')],
    [
      pitchSlot('left-cb', 'CB'),
      pitchSlot('centre-cb', 'CB'),
      pitchSlot('right-cb', 'CB'),
    ],
    [pitchSlot('gk', 'GK')],
  ],

  '5-3-2': [
    [
      pitchSlot('left-st', 'ST'),
      pitchSlot('right-st', 'ST'),
    ],
    [
      pitchSlot('left-cm', 'CM'),
      pitchSlot('cm', 'CM'),
      pitchSlot('right-cm', 'CM'),
    ],
    [
      pitchSlot('lwb', 'LWB'),
      pitchSlot('left-cb', 'CB'),
      pitchSlot('centre-cb', 'CB'),
      pitchSlot('right-cb', 'CB'),
      pitchSlot('rwb', 'RWB'),
    ],
    [pitchSlot('gk', 'GK')],
  ],

  '5-4-1': [
    [pitchSlot('st', 'ST')],
    [
      pitchSlot('lm', 'LM'),
      pitchSlot('left-cm', 'CM'),
      pitchSlot('right-cm', 'CM'),
      pitchSlot('rm', 'RM'),
    ],
    [
      pitchSlot('lwb', 'LWB'),
      pitchSlot('left-cb', 'CB'),
      pitchSlot('centre-cb', 'CB'),
      pitchSlot('right-cb', 'CB'),
      pitchSlot('rwb', 'RWB'),
    ],
    [pitchSlot('gk', 'GK')],
  ],

  '5-2-3': [
    [
      pitchSlot('lw', 'LW'),
      pitchSlot('st', 'ST'),
      pitchSlot('rw', 'RW'),
    ],
    [
      pitchSlot('left-cm', 'CM'),
      pitchSlot('right-cm', 'CM'),
    ],
    [
      pitchSlot('lwb', 'LWB'),
      pitchSlot('left-cb', 'CB'),
      pitchSlot('centre-cb', 'CB'),
      pitchSlot('right-cb', 'CB'),
      pitchSlot('rwb', 'RWB'),
    ],
    [pitchSlot('gk', 'GK')],
  ],
}

const roleFields = [
  {
    key: 'captain',
    label: 'Captain',
  },
  {
    key: 'is_left_corner_taker',
    label: 'Left corner taker',
  },
  {
    key: 'is_right_corner_taker',
    label: 'Right corner taker',
  },
  {
    key: 'is_penalty_taker',
    label: 'Penalty taker',
  },
  {
    key: 'is_freekick_taker',
    label: 'Free-kick taker',
  },
]

const positionFamilies = {
  LCB: 'CB',
  RCB: 'CB',
  LCM: 'CM',
  RCM: 'CM',
  LDM: 'CDM',
  RDM: 'CDM',
  LAM: 'CAM',
  RAM: 'CAM',
  LS: 'ST',
  RS: 'ST',
}

function recordFor(player) {
  return (
    player.user ||
    player.player ||
    player
  )
}

function playerId(player) {
  const record = recordFor(player)

  const id =
    record.id ||
    player.user_id

  return id === undefined ||
    id === null
    ? ''
    : String(id)
}

function selectionUserId(selection) {
  const id =
    selection.user_id ||
    selection.user?.id

  return id === undefined ||
    id === null
    ? ''
    : String(id)
}

function playerName(player) {
  const record = recordFor(player)

  if (record.name?.trim()) {
    return record.name.trim()
  }

  const fullName = [
    record.first_name,
    record.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return (
    fullName ||
    record.email ||
    'Unknown player'
  )
}

function playerInitials(player) {
  const name =
    playerName(player)

  const parts = name
    .split(/\s+/)
    .filter(Boolean)

  return parts
    .slice(0, 2)
    .map(
      (part) =>
        part[0],
    )
    .join('')
    .toUpperCase()
}

function preferredPosition(player) {
  const record = recordFor(player)

  return (
    player.preferred_position ||
    record.preferred_position ||
    player.team_membership
      ?.preferred_position ||
    ''
  )
}

function basePosition(position) {
  return (
    positionFamilies[position] ||
    position ||
    ''
  )
}

function flatSlots(formation) {
  return (
    formationLayouts[formation] || []
  ).flat()
}

function assignStartersToFormation(
  formation,
  starterSelections,
) {
  const slots =
    flatSlots(formation)

  const remaining = [
    ...starterSelections,
  ]

  const assignments = {}

  function assignMatchingPlayers(
    matcher,
  ) {
    slots.forEach((slot) => {
      if (
        assignments[slot.id]
      ) {
        return
      }

      const index =
        remaining.findIndex(
          (selection) =>
            matcher(
              selection,
              slot,
            ),
        )

      if (index === -1) {
        return
      }

      assignments[slot.id] =
        selectionUserId(
          remaining[index],
        )

      remaining.splice(
        index,
        1,
      )
    })
  }

  assignMatchingPlayers(
    (selection, slot) =>
      selection.position ===
      slot.position,
  )

  assignMatchingPlayers(
    (selection, slot) =>
      basePosition(
        selection.position,
      ) ===
      basePosition(
        slot.position,
      ),
  )

  assignMatchingPlayers(
    () => true,
  )

  return assignments
}

function SquadSelectionPage() {
  const navigate =
    useNavigate()

  const {
    teamId,
    matchId,
  } = useParams()

  const [
    match,
    setMatch,
  ] = useState(null)

  const [
    availablePlayers,
    setAvailablePlayers,
  ] = useState([])

  const [
    selections,
    setSelections,
  ] = useState([])

  const [
    formation,
    setFormation,
  ] = useState('')

  const [
    lineup,
    setLineup,
  ] = useState({})

  const [
    swapSourceSlotId,
    setSwapSourceSlotId,
  ] = useState('')

  const [
    substituteIds,
    setSubstituteIds,
  ] = useState([])

  const [
    substitutePositions,
    setSubstitutePositions,
  ] = useState({})

  const [
    roles,
    setRoles,
  ] = useState({
    captain: '',
    is_left_corner_taker: '',
    is_right_corner_taker: '',
    is_penalty_taker: '',
    is_freekick_taker: '',
  })

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('')

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('')

  useEffect(() => {
    async function fetchSquadData() {
      const token =
        localStorage.getItem(
          'token',
        )

      if (!token) {
        navigate(
          '/login',
          {
            replace: true,
          },
        )

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
          availabilityResponse,
          selectionResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/teams/${teamId}/matches/${matchId}`,
            {
              headers,
            },
          ),

          fetch(
            `${API_URL}/teams/${teamId}/matches/${matchId}/availabilities`,
            {
              headers,
            },
          ),

          fetch(
            `${API_URL}/teams/${teamId}/matches/${matchId}/squad_selections`,
            {
              headers,
            },
          ),
        ])

        if (
          matchResponse.status ===
            401 ||
          availabilityResponse.status ===
            401 ||
          selectionResponse.status ===
            401
        ) {
          localStorage.removeItem(
            'token',
          )

          localStorage.removeItem(
            'currentUser',
          )

          navigate(
            '/login',
            {
              replace: true,
            },
          )

          return
        }

        if (
          matchResponse.status ===
            403 ||
          availabilityResponse.status ===
            403 ||
          selectionResponse.status ===
            403
        ) {
          navigate(
            '/dashboard',
            {
              replace: true,
            },
          )

          return
        }

        const matchData =
          await matchResponse.json()

        const availabilityData =
          await availabilityResponse.json()

        const selectionData =
          await selectionResponse.json()

        if (
          !matchResponse.ok
        ) {
          throw new Error(
            matchData.error ||
              'Unable to load the fixture.',
          )
        }

        if (
          !availabilityResponse.ok
        ) {
          throw new Error(
            availabilityData.error ||
              'Unable to load player availability.',
          )
        }

        if (
          !selectionResponse.ok
        ) {
          throw new Error(
            selectionData.error ||
              'Unable to load the squad selection.',
          )
        }

        const matchRecord =
          matchData.match ||
          matchData

        const availabilityList =
          Array.isArray(
            availabilityData,
          )
            ? availabilityData
            : availabilityData.players ||
              availabilityData.availabilities ||
              []

        const selectionList =
          Array.isArray(
            selectionData,
          )
            ? selectionData
            : selectionData.squad_selections ||
              []

        /*
         * Availability controls who is currently
         * eligible to be newly selected.
         */
        const available =
          availabilityList.filter(
            (player) =>
              player.status ===
              'available',
          )

        /*
         * IMPORTANT:
         *
         * Saved SquadSelection records are the
         * source of truth for an existing saved
         * squad.
         *
         * We deliberately DO NOT filter these
         * against current availability.
         */
        const starterSelections =
          selectionList.filter(
            (selection) =>
              selection.selection_type ===
              'starter',
          )

        const substitutes =
          selectionList.filter(
            (selection) =>
              selection.selection_type ===
              'substitute',
          )

        const savedFormation =
          matchRecord.formation ||
          ''

        const initialLineup =
          savedFormation
            ? assignStartersToFormation(
                savedFormation,
                starterSelections,
              )
            : {}

        const initialStarterIds =
          new Set(
            Object.values(
              initialLineup,
            ).filter(Boolean),
          )

        const initialSubstitutePositions =
          {}

        substitutes.forEach(
          (selection) => {
            initialSubstitutePositions[
              selectionUserId(
                selection,
              )
            ] = basePosition(
              selection.position,
            )
          },
        )

        const roleSelections = {}

        roleFields.forEach(
          ({ key }) => {
            const selectedPlayer =
              starterSelections.find(
                (selection) =>
                  selection[key],
              )

            const selectedId =
              selectedPlayer
                ? selectionUserId(
                    selectedPlayer,
                  )
                : ''

            roleSelections[key] =
              !savedFormation ||
              initialStarterIds.has(
                selectedId,
              )
                ? selectedId
                : ''
          },
        )

        setMatch(
          matchRecord,
        )

        setAvailablePlayers(
          available,
        )

        setSelections(
          selectionList,
        )

        setFormation(
          savedFormation,
        )

        setLineup(
          initialLineup,
        )

        setSubstituteIds(
          substitutes.map(
            selectionUserId,
          ),
        )

        setSubstitutePositions(
          initialSubstitutePositions,
        )

        setRoles(
          roleSelections,
        )

        setErrorMessage('')
      } catch (error) {
        setErrorMessage(
          error.message ||
            'Unable to connect to the server.',
        )
      } finally {
        setLoading(false)
      }
    }

    fetchSquadData()
  }, [
    navigate,
    teamId,
    matchId,
  ])

  const formationRows =
    formationLayouts[
      formation
    ] || []

  const formationSlots =
    useMemo(
      () =>
        formationRows.flat(),
      [formationRows],
    )

  /*
   * Players currently available PLUS
   * players already stored in a saved
   * SquadSelection.
   *
   * This lets saved players still render
   * after refreshing the page.
   */
  const playersById =
    useMemo(() => {
      const players =
        new Map()

      availablePlayers.forEach(
        (player) => {
          players.set(
            playerId(player),
            player,
          )
        },
      )

      selections.forEach(
        (selection) => {
          const user =
            selection.user ||
            selection.player

          if (!user) {
            return
          }

          players.set(
            selectionUserId(
              selection,
            ),
            {
              ...user,

              preferred_position:
                selection.preferred_position ||
                user.preferred_position ||
                '',
            },
          )
        },
      )

      return players
    }, [
      availablePlayers,
      selections,
    ])

  const lineupStarterIds =
    formationSlots
      .map(
        (slot) =>
          lineup[slot.id],
      )
      .filter(Boolean)

  /*
   * Do not remove persisted starters
   * just because they are no longer
   * inside the current availability list.
   */
  const persistedStarterIds =
    selections
      .filter(
        (selection) =>
          selection.selection_type ===
          'starter',
      )
      .map(
        selectionUserId,
      )

  const starterIds =
    formation
      ? lineupStarterIds
      : persistedStarterIds

  const starterIdSet =
    new Set(
      starterIds,
    )

  /*
   * Saved substitutes should remain
   * visible after refresh too.
   */
  const validSubstituteIds =
    substituteIds.filter(
      (id) =>
        !starterIdSet.has(id),
    )

  const substituteIdSet =
    new Set(
      validSubstituteIds,
    )

  /*
   * Available pool still only contains
   * players who are CURRENTLY available
   * and not already selected.
   */
  const availablePoolCount =
    availablePlayers.filter(
      (player) => {
        const id =
          playerId(player)

        return (
          !starterIdSet.has(id) &&
          !substituteIdSet.has(id)
        )
      },
    ).length

  /*
   * Only currently available players
   * should be offered for NEW bench
   * selection.
   */
  const nonStarters =
    availablePlayers.filter(
      (player) =>
        !starterIdSet.has(
          playerId(player),
        ),
    )

  /*
   * Role dropdowns use playersById
   * so previously saved starters can
   * still appear after refresh.
   */
  const starterOptions =
    formationSlots
      .map(
        (slot) =>
          playersById.get(
            lineup[slot.id],
          ),
      )
      .filter(Boolean)

  function clearRolesForPlayer(
    id,
  ) {
    if (!id) {
      return
    }

    setRoles(
      (currentRoles) => {
        const nextRoles = {
          ...currentRoles,
        }

        roleFields.forEach(
          ({ key }) => {
            if (
              nextRoles[key] ===
              id
            ) {
              nextRoles[key] =
                ''
            }
          },
        )

        return nextRoles
      },
    )
  }

  function currentStarterSelections() {
    if (!formation) {
      return selections.filter(
        (selection) =>
          selection.selection_type ===
          'starter',
      )
    }

    const slotsById =
      new Map(
        formationSlots.map(
          (slot) => [
            slot.id,
            slot,
          ],
        ),
      )

    return Object.entries(
      lineup,
    )
      .filter(
        ([, id]) => id,
      )
      .map(
        ([slotId, id]) => ({
          user_id: id,

          position:
            slotsById.get(
              slotId,
            )?.position ||
            '',
        }),
      )
  }

  function handleFormationChange(
    event,
  ) {
    const nextFormation =
      event.target.value

    /*
     * Existing saved starters should
     * remain eligible when switching
     * formation.
     *
     * Current availability is used for
     * new selections elsewhere.
     */
    const starters =
      currentStarterSelections()

    setFormation(
      nextFormation,
    )

    setSwapSourceSlotId(
      '',
    )

    setLineup(
      nextFormation
        ? assignStartersToFormation(
            nextFormation,
            starters,
          )
        : {},
    )

    setErrorMessage('')
    setSuccessMessage('')
  }

  function handleSlotChange(
    slotId,
    event,
  ) {
    const nextPlayerId =
      event.target.value

    const previousPlayerId =
      lineup[slotId] ||
      ''

    setLineup(
      (currentLineup) => {
        const nextLineup = {
          ...currentLineup,
        }

        Object.keys(
          nextLineup,
        ).forEach(
          (currentSlotId) => {
            if (
              nextLineup[
                currentSlotId
              ] ===
              nextPlayerId
            ) {
              nextLineup[
                currentSlotId
              ] = ''
            }
          },
        )

        nextLineup[slotId] =
          nextPlayerId

        return nextLineup
      },
    )

    setSwapSourceSlotId(
      '',
    )

    if (
      nextPlayerId
    ) {
      setSubstituteIds(
        (currentIds) =>
          currentIds.filter(
            (id) =>
              id !==
              nextPlayerId,
          ),
      )
    }

    if (
      previousPlayerId &&
      previousPlayerId !==
        nextPlayerId
    ) {
      clearRolesForPlayer(
        previousPlayerId,
      )
    }

    setErrorMessage('')
    setSuccessMessage('')
  }

  function handlePlayerSwap(
    slotId,
  ) {
    const selectedPlayerId =
      lineup[slotId]

    if (
      saving ||
      !selectedPlayerId
    ) {
      return
    }

    if (
      !swapSourceSlotId
    ) {
      setSwapSourceSlotId(
        slotId,
      )

      setErrorMessage('')
      setSuccessMessage('')

      return
    }

    if (
      swapSourceSlotId ===
      slotId
    ) {
      setSwapSourceSlotId(
        '',
      )

      return
    }

    setLineup(
      (currentLineup) => ({
        ...currentLineup,

        [swapSourceSlotId]:
          currentLineup[
            slotId
          ],

        [slotId]:
          currentLineup[
            swapSourceSlotId
          ],
      }),
    )

    setSwapSourceSlotId(
      '',
    )

    setErrorMessage('')
    setSuccessMessage('')
  }

  function toggleSubstitute(
    player,
  ) {
    const id =
      playerId(player)

    setSubstituteIds(
      (currentIds) => {
        if (
          currentIds.includes(
            id,
          )
        ) {
          return currentIds.filter(
            (currentId) =>
              currentId !==
              id,
          )
        }

        return [
          ...currentIds,
          id,
        ]
      },
    )

    setSubstitutePositions(
      (currentPositions) => ({
        ...currentPositions,

        [id]:
          currentPositions[id] ||
          basePosition(
            preferredPosition(
              player,
            ),
          ),
      }),
    )

    setErrorMessage('')
    setSuccessMessage('')
  }

  function handleRoleChange(
    event,
  ) {
    const {
      name,
      value,
    } = event.target

    setRoles(
      (currentRoles) => ({
        ...currentRoles,
        [name]: value,
      }),
    )

    setErrorMessage('')
    setSuccessMessage('')
  }

  function handleSubstitutePositionChange(
    id,
    event,
  ) {
    setSubstitutePositions(
      (currentPositions) => ({
        ...currentPositions,
        [id]:
          event.target.value,
      }),
    )

    setErrorMessage('')
    setSuccessMessage('')
  }

  function selectionNeedsUpdate(
    existingSelection,
    desiredSelection,
  ) {
    return (
      existingSelection.selection_type !==
        desiredSelection.selection_type ||

      existingSelection.position !==
        desiredSelection.position ||

      Boolean(
        existingSelection.captain,
      ) !==
        desiredSelection.captain ||

      Boolean(
        existingSelection.is_left_corner_taker,
      ) !==
        desiredSelection.is_left_corner_taker ||

      Boolean(
        existingSelection.is_right_corner_taker,
      ) !==
        desiredSelection.is_right_corner_taker ||

      Boolean(
        existingSelection.is_penalty_taker,
      ) !==
        desiredSelection.is_penalty_taker ||

      Boolean(
        existingSelection.is_freekick_taker,
      ) !==
        desiredSelection.is_freekick_taker
    )
  }

  async function readApiResponse(
    response,
    fallbackMessage,
  ) {
    if (
      response.status ===
      401
    ) {
      localStorage.removeItem(
        'token',
      )

      localStorage.removeItem(
        'currentUser',
      )

      navigate(
        '/login',
        {
          replace: true,
        },
      )

      throw new Error(
        'Your session has expired. Please sign in again.',
      )
    }

    if (
      response.status ===
      403
    ) {
      navigate(
        '/dashboard',
        {
          replace: true,
        },
      )

      throw new Error(
        'You are not allowed to manage this squad.',
      )
    }

    let data = null

    const responseText =
      await response.text()

    if (
      responseText
    ) {
      try {
        data =
          JSON.parse(
            responseText,
          )
      } catch {
        data = null
      }
    }

    if (
      !response.ok
    ) {
      throw new Error(
        data?.errors?.join(
          ', ',
        ) ||
          data?.error ||
          fallbackMessage,
      )
    }

    return data
  }

  async function handleSaveLineup() {
    const token =
      localStorage.getItem(
        'token',
      )

    if (!token) {
      navigate(
        '/login',
        {
          replace: true,
        },
      )

      return
    }

    if (!formation) {
      setErrorMessage(
        'Please select a formation.',
      )

      return
    }

    if (
      starterIds.length !==
      11
    ) {
      setErrorMessage(
        `Please select all 11 starters. You currently have ${starterIds.length}.`,
      )

      return
    }

    const missingRole =
      roleFields.find(
        ({ key }) =>
          !roles[key],
      )

    if (
      missingRole
    ) {
      setErrorMessage(
        `Please select the ${missingRole.label.toLowerCase()}.`,
      )

      return
    }

    const substituteWithoutPosition =
      validSubstituteIds.find(
        (id) =>
          !substitutePositions[
            id
          ],
      )

    if (
      substituteWithoutPosition
    ) {
      setErrorMessage(
        `Please select a position for ${playerName(
          playersById.get(
            substituteWithoutPosition,
          ),
        )}.`,
      )

      return
    }

    const desiredSelections =
      new Map()

    formationSlots.forEach(
      (slot) => {
        const id =
          lineup[slot.id]

        desiredSelections.set(
          id,
          {
            user_id:
              id,

            selection_type:
              'starter',

            position:
              slot.position,

            captain:
              roles.captain ===
              id,

            is_left_corner_taker:
              roles.is_left_corner_taker ===
              id,

            is_right_corner_taker:
              roles.is_right_corner_taker ===
              id,

            is_penalty_taker:
              roles.is_penalty_taker ===
              id,

            is_freekick_taker:
              roles.is_freekick_taker ===
              id,
          },
        )
      },
    )

    validSubstituteIds.forEach(
      (id) => {
        desiredSelections.set(
          id,
          {
            user_id:
              id,

            selection_type:
              'substitute',

            position:
              substitutePositions[
                id
              ],

            captain:
              false,

            is_left_corner_taker:
              false,

            is_right_corner_taker:
              false,

            is_penalty_taker:
              false,

            is_freekick_taker:
              false,
          },
        )
      },
    )

    const headers = {
      Accept:
        'application/json',

      'Content-Type':
        'application/json',

      Authorization:
        token,
    }

    const matchUrl =
      `${API_URL}/teams/${teamId}/matches/${matchId}`

    const selectionBaseUrl =
      `${API_URL}/teams/${teamId}/matches/${matchId}/squad_selections`

    setSaving(true)

    setErrorMessage('')
    setSuccessMessage('')

    try {
      const matchResponse =
        await fetch(
          matchUrl,
          {
            method:
              'PATCH',

            headers,

            body:
              JSON.stringify({
                match: {
                  formation,
                },
              }),
          },
        )

      const savedMatchData =
        await readApiResponse(
          matchResponse,
          'Unable to save the formation.',
        )

      const savedSelections =
        []

      for (
        const existingSelection
        of selections
      ) {
        const id =
          selectionUserId(
            existingSelection,
          )

        const desiredSelection =
          desiredSelections.get(
            id,
          )

        if (
          !desiredSelection
        ) {
          const deleteResponse =
            await fetch(
              `${selectionBaseUrl}/${existingSelection.id}`,
              {
                method:
                  'DELETE',

                headers,
              },
            )

          await readApiResponse(
            deleteResponse,
            'Unable to remove an old squad selection.',
          )

          continue
        }

        desiredSelections.delete(
          id,
        )

        if (
          !selectionNeedsUpdate(
            existingSelection,
            desiredSelection,
          )
        ) {
          savedSelections.push(
            existingSelection,
          )

          continue
        }

        const updateResponse =
          await fetch(
            `${selectionBaseUrl}/${existingSelection.id}`,
            {
              method:
                'PATCH',

              headers,

              body:
                JSON.stringify({
                  squad_selection:
                    desiredSelection,
                }),
            },
          )

        const updateData =
          await readApiResponse(
            updateResponse,
            'Unable to update a squad selection.',
          )

        savedSelections.push(
          updateData
            ?.squad_selection ||
            updateData || {
              ...existingSelection,
              ...desiredSelection,
            },
        )
      }

      for (
        const desiredSelection
        of desiredSelections.values()
      ) {
        const createResponse =
          await fetch(
            selectionBaseUrl,
            {
              method:
                'POST',

              headers,

              body:
                JSON.stringify({
                  squad_selection:
                    desiredSelection,
                }),
            },
          )

        const createData =
          await readApiResponse(
            createResponse,
            'Unable to add a player to the squad.',
          )

        savedSelections.push(
          createData
            ?.squad_selection ||
            createData,
        )
      }

      setMatch(
        savedMatchData?.match ||
          savedMatchData || {
            ...match,
            formation,
          },
      )

      setSelections(
        savedSelections,
      )

      setSuccessMessage(
        'Formation and line-up saved successfully.',
      )
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to connect to the server.',
      )
    } finally {
      setSaving(false)
    }
  }

  function playerRoleBadges(
    id,
  ) {
    if (!id) {
      return []
    }

    const badges = []

    if (
      roles.captain ===
      id
    ) {
      badges.push({
        label:
          'C',

        title:
          'Captain',
      })
    }

    const setPieceRoles =
      []

    if (
      roles.is_left_corner_taker ===
      id
    ) {
      setPieceRoles.push(
        'Left corners',
      )
    }

    if (
      roles.is_right_corner_taker ===
      id
    ) {
      setPieceRoles.push(
        'Right corners',
      )
    }

    if (
      roles.is_penalty_taker ===
      id
    ) {
      setPieceRoles.push(
        'Penalties',
      )
    }

    if (
      roles.is_freekick_taker ===
      id
    ) {
      setPieceRoles.push(
        'Free kicks',
      )
    }

    if (
      setPieceRoles.length >
      0
    ) {
      badges.push({
        label:
          'SP',

        title:
          setPieceRoles.join(
            ', ',
          ),
      })
    }

    return badges
  }

  if (loading) {
    return (
      <p className="dashboard-message">
        Loading squad selection...
      </p>
    )
  }

  return (
    <>
      <Navbar />

      <main className="dashboard-page">
        <section className="dashboard-content">
          <BackButton
            to={`/teams/${teamId}/matches/${matchId}`}
            label="Back to match"
          />

          {match && (
            <div className="dashboard-welcome">
              <p className="dashboard-label">
                Squad management
              </p>

              <h1>
                Build your matchday squad
              </h1>

              <p>
                Choose the formation,
                starting XI and substitutes
                against{' '}

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
              className="team-success"
              role="status"
            >
              {successMessage}
            </p>
          )}

          {match && (
            <>
              <section className="squad-selection-summary">
                <article>
                  <span>
                    Starting XI
                  </span>

                  <strong>
                    {starterIds.length}/11
                  </strong>
                </article>

                <article>
                  <span>
                    Substitutes
                  </span>

                  <strong>
                    {
                      validSubstituteIds.length
                    }
                  </strong>
                </article>

                <article>
                  <span>
                    Available players
                  </span>

                  <strong>
                    {
                      availablePoolCount
                    }
                  </strong>
                </article>
              </section>

              <section className="lineup-builder">
                <div className="lineup-pitch-panel">
                  <div className="formation-toolbar">
                    <div className="form-group">
                      <label htmlFor="match-formation">
                        Formation
                      </label>

                      <select
                        id="match-formation"
                        value={formation}
                        onChange={
                          handleFormationChange
                        }
                        disabled={
                          saving
                        }
                      >
                        <option value="">
                          Select formation
                        </option>

                        {Object.keys(
                          formationLayouts,
                        ).map(
                          (option) => (
                            <option
                              value={
                                option
                              }
                              key={
                                option
                              }
                            >
                              {
                                option
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <span className="formation-progress">
                      {
                        starterIds.length
                      }{' '}
                      of 11 positions filled
                    </span>
                  </div>

                  {formation && (
                    <p className="player-swap-help">
                      {swapSourceSlotId
                        ? 'Now tap another player circle to swap their positions.'
                        : 'Tip: tap one player circle, then another, to swap them.'}
                    </p>
                  )}

                  {!formation ? (
                    <article className="formation-empty-state">
                      <div className="card-icon">
                        ⚽
                      </div>

                      <h2>
                        Select a formation
                      </h2>

                      <p>
                        The pitch will update
                        automatically when you
                        choose a formation.
                      </p>
                    </article>
                  ) : (
                    <div
                      className="football-pitch"
                      aria-label={`${formation} formation`}
                    >
                      <div
                        className="pitch-markings"
                        aria-hidden="true"
                      >
                        <span className="pitch-halfway-line" />
                        <span className="pitch-centre-circle" />
                        <span className="pitch-top-box" />
                        <span className="pitch-bottom-box" />
                      </div>

                      <div
                        className={`formation-grid rows-${formationRows.length}`}
                      >
                        {formationRows.map(
                          (
                            row,
                            rowIndex,
                          ) => (
                            <div
                              className="formation-row"
                              key={`row-${rowIndex}`}
                            >
                              {row.map(
                                (slot) => {
                                  const selectedId =
                                    lineup[
                                      slot.id
                                    ] ||
                                    ''

                                  const selectedPlayer =
                                    playersById.get(
                                      selectedId,
                                    )

                                  const usedByAnotherSlot =
                                    new Set(
                                      starterIds.filter(
                                        (id) =>
                                          id !==
                                          selectedId,
                                      ),
                                    )

                                  const badges =
                                    playerRoleBadges(
                                      selectedId,
                                    )

                                  return (
                                    <div
                                      className={`pitch-player-slot ${
                                        selectedPlayer
                                          ? 'filled'
                                          : ''
                                      } ${
                                        swapSourceSlotId ===
                                        slot.id
                                          ? 'swap-selected'
                                          : ''
                                      }`}
                                      key={
                                        slot.id
                                      }
                                    >
                                      <button
                                        type="button"
                                        className="pitch-player-avatar"
                                        onClick={() =>
                                          handlePlayerSwap(
                                            slot.id,
                                          )
                                        }
                                        disabled={
                                          saving ||
                                          !selectedPlayer
                                        }
                                        aria-label={
                                          selectedPlayer
                                            ? `Select ${playerName(
                                                selectedPlayer,
                                              )} to swap positions`
                                            : 'Empty position'
                                        }
                                      >
                                        {selectedPlayer
                                          ? playerInitials(
                                              selectedPlayer,
                                            )
                                          : '+'}
                                      </button>

                                      {badges.length >
                                        0 && (
                                        <div
                                          className="pitch-role-badges"
                                          aria-label="Player roles"
                                        >
                                          {badges.map(
                                            (
                                              badge,
                                            ) => (
                                              <span
                                                key={
                                                  badge.label
                                                }
                                                title={
                                                  badge.title
                                                }
                                                aria-label={
                                                  badge.title
                                                }
                                              >
                                                {
                                                  badge.label
                                                }
                                              </span>
                                            ),
                                          )}
                                        </div>
                                      )}

                                      <label
                                        htmlFor={`pitch-slot-${slot.id}`}
                                      >
                                        {
                                          slot.position
                                        }
                                      </label>

                                      <select
                                        id={`pitch-slot-${slot.id}`}
                                        value={
                                          selectedId
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          handleSlotChange(
                                            slot.id,
                                            event,
                                          )
                                        }
                                        disabled={
                                          saving
                                        }
                                        aria-label={`Select ${slot.position}`}
                                      >
                                        <option value="">
                                          Choose player
                                        </option>

                                        {/*
                                          Keep the currently selected
                                          saved player in the dropdown,
                                          while only offering AVAILABLE
                                          players for new selection.
                                        */}

                                        {selectedPlayer &&
                                          !availablePlayers.some(
                                            (player) =>
                                              playerId(
                                                player,
                                              ) ===
                                              selectedId,
                                          ) && (
                                            <option
                                              value={
                                                selectedId
                                              }
                                            >
                                              {playerName(
                                                selectedPlayer,
                                              )}
                                            </option>
                                          )}

                                        {availablePlayers
                                          .filter(
                                            (
                                              player,
                                            ) =>
                                              !usedByAnotherSlot.has(
                                                playerId(
                                                  player,
                                                ),
                                              ),
                                          )
                                          .map(
                                            (
                                              player,
                                            ) => (
                                              <option
                                                value={playerId(
                                                  player,
                                                )}
                                                key={playerId(
                                                  player,
                                                )}
                                              >
                                                {playerName(
                                                  player,
                                                )}
                                              </option>
                                            ),
                                          )}
                                      </select>
                                    </div>
                                  )
                                },
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <aside className="lineup-roles-panel">
                  <p className="dashboard-label">
                    Match roles
                  </p>

                  <h2>
                    Responsibilities
                  </h2>

                  <p>
                    Choose each role from the
                    players in the starting XI.
                    One player can take more
                    than one set piece.
                  </p>

                  <div className="lineup-role-fields">
                    {roleFields.map(
                      ({
                        key,
                        label,
                      }) => (
                        <div
                          className="form-group"
                          key={key}
                        >
                          <label
                            htmlFor={`role-${key}`}
                          >
                            {label}
                          </label>

                          <select
                            id={`role-${key}`}
                            name={key}
                            value={
                              roles[key]
                            }
                            onChange={
                              handleRoleChange
                            }
                            disabled={
                              saving ||
                              starterOptions.length ===
                                0
                            }
                          >
                            <option value="">
                              Select player
                            </option>

                            {starterOptions.map(
                              (
                                player,
                              ) => (
                                <option
                                  value={playerId(
                                    player,
                                  )}
                                  key={playerId(
                                    player,
                                  )}
                                >
                                  {playerName(
                                    player,
                                  )}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      ),
                    )}
                  </div>
                </aside>
              </section>

              <section className="substitute-selection-panel">
                <div className="substitute-selection-heading">
                  <div>
                    <p className="dashboard-label">
                      Matchday bench
                    </p>

                    <h2>
                      Select substitutes
                    </h2>
                  </div>

                  <strong>
                    {
                      validSubstituteIds.length
                    }{' '}
                    selected
                  </strong>
                </div>

                {/*
                  SAVED SUBSTITUTES
                  -----------------
                  These remain visible even if
                  their availability later changes.
                */}

                {validSubstituteIds.length >
                  0 && (
                  <div className="substitute-player-list">
                    {validSubstituteIds
                      .map(
                        (id) =>
                          playersById.get(
                            id,
                          ),
                      )
                      .filter(Boolean)
                      .map(
                        (player) => {
                          const id =
                            playerId(
                              player,
                            )

                          return (
                            <article
                              className="substitute-player-card selected"
                              key={`saved-${id}`}
                            >
                              <div className="substitute-player-details">
                                <div
                                  className="player-avatar"
                                  aria-hidden="true"
                                >
                                  {playerInitials(
                                    player,
                                  )}
                                </div>

                                <div>
                                  <h3>
                                    {playerName(
                                      player,
                                    )}
                                  </h3>

                                  <p>
                                    {preferredPosition(
                                      player,
                                    )
                                      ? `Preferred: ${preferredPosition(
                                          player,
                                        )}`
                                      : 'Saved substitute'}
                                  </p>
                                </div>
                              </div>

                              <div className="substitute-player-actions">
                                <select
                                  value={
                                    substitutePositions[
                                      id
                                    ] ||
                                    ''
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    handleSubstitutePositionChange(
                                      id,
                                      event,
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                  aria-label={`Position for ${playerName(
                                    player,
                                  )}`}
                                >
                                  <option value="">
                                    Position
                                  </option>

                                  {benchPositions.map(
                                    (
                                      position,
                                    ) => (
                                      <option
                                        value={
                                          position
                                        }
                                        key={
                                          position
                                        }
                                      >
                                        {
                                          position
                                        }
                                      </option>
                                    ),
                                  )}
                                </select>

                                <button
                                  className="remove"
                                  type="button"
                                  onClick={() =>
                                    toggleSubstitute(
                                      player,
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            </article>
                          )
                        },
                      )}
                  </div>
                )}

                {/*
                  AVAILABLE PLAYERS
                  -----------------
                  Only currently available players
                  are offered as NEW substitutes.
                */}

                {nonStarters.filter(
                  (player) =>
                    !substituteIdSet.has(
                      playerId(player),
                    ),
                ).length === 0 ? (
                  validSubstituteIds.length ===
                  0 && (
                    <p className="substitute-empty-message">
                      Every available player is
                      currently in the starting XI.
                    </p>
                  )
                ) : (
                  <div className="substitute-player-list">
                    {nonStarters
                      .filter(
                        (player) =>
                          !substituteIdSet.has(
                            playerId(
                              player,
                            ),
                          ),
                      )
                      .map(
                        (player) => {
                          const id =
                            playerId(
                              player,
                            )

                          return (
                            <article
                              className="substitute-player-card"
                              key={`available-${id}`}
                            >
                              <div className="substitute-player-details">
                                <div
                                  className="player-avatar"
                                  aria-hidden="true"
                                >
                                  {playerInitials(
                                    player,
                                  )}
                                </div>

                                <div>
                                  <h3>
                                    {playerName(
                                      player,
                                    )}
                                  </h3>

                                  <p>
                                    {preferredPosition(
                                      player,
                                    )
                                      ? `Preferred: ${preferredPosition(
                                          player,
                                        )}`
                                      : 'No preferred position set'}
                                  </p>
                                </div>
                              </div>

                              <div className="substitute-player-actions">
                                <button
                                  className="add"
                                  type="button"
                                  onClick={() =>
                                    toggleSubstitute(
                                      player,
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                >
                                  Add to bench
                                </button>
                              </div>
                            </article>
                          )
                        },
                      )}
                  </div>
                )}
              </section>

              <div className="save-lineup-bar">
                <p>
                  Saving will update the
                  formation, starting XI,
                  substitutes and match roles
                  together.
                </p>

                <button
                  className="save-lineup-button"
                  type="button"
                  onClick={
                    handleSaveLineup
                  }
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? 'Saving line-up...'
                    : 'Save line-up'}
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  )
}

export default SquadSelectionPage
