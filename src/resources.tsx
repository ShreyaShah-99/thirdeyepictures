/**
 * Shared live-resource context.
 *
 * Loads crew members, SD cards, and hard drives from the backend once and
 * exposes them to any component (e.g. the workflow stage forms) so dropdowns
 * show real records from the DynamoDB tables instead of the static demo data
 * that used to live in data.ts.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { crewApi, hardDrivesApi, sdCardsApi } from './api'
import { useAuth } from './auth'
import type { CrewMember, HardDrive, SDCard } from './types'

interface ResourcesValue {
  members: CrewMember[]
  sdCards: SDCard[]
  hardDrives: HardDrive[]
  loading: boolean
  /** Re-fetch all three lists from the backend. */
  refresh: () => Promise<void>
}

const ResourcesContext = createContext<ResourcesValue | null>(null)

export function ResourcesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [members, setMembers] = useState<CrewMember[]>([])
  const [sdCards, setSdCards] = useState<SDCard[]>([])
  const [hardDrives, setHardDrives] = useState<HardDrive[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const [crew, cards, drives] = await Promise.all([
        crewApi.list(),
        sdCardsApi.list(),
        hardDrivesApi.list(),
      ])
      // Guard against non-array responses (e.g. an error object) so consumers
      // can always safely call .find/.filter/.map on these.
      setMembers(Array.isArray(crew) ? crew : [])
      setSdCards(Array.isArray(cards) ? cards : [])
      setHardDrives(Array.isArray(drives) ? drives : [])
    } catch (err) {
      console.error('Failed to load resources:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load once the user is authenticated (the APIs require a token).
  useEffect(() => {
    if (user) refresh()
    else {
      setMembers([])
      setSdCards([])
      setHardDrives([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <ResourcesContext.Provider value={{ members, sdCards, hardDrives, loading, refresh }}>
      {children}
    </ResourcesContext.Provider>
  )
}

/**
 * Access live crew / SD card / hard drive lists.
 * Safe to call outside the provider — returns empty arrays as a fallback.
 */
export function useResources(): ResourcesValue {
  const ctx = useContext(ResourcesContext)
  if (!ctx) {
    return {
      members: [],
      sdCards: [],
      hardDrives: [],
      loading: false,
      refresh: async () => {},
    }
  }
  return ctx
}
