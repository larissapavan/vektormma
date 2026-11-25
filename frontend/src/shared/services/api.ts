import axios from 'axios'

import { apiBaseURL, BUILD_ID } from './apiBase'
import { eventsFrom, rowsFrom, type Columns, type EventColumns } from './columns'
import type {
  DivisionMatrix,
  OtherOrganization,
  ChampionsResponse,
  DataInfo,
  FighterModelRecord,
  Surprises,
  EventSummary,
  FighterPerformance,
  FighterProfile,
  HeadToHeadResponse,
  FightRecord,
  GymDetail,
  GymSummary,
  HealthInfo,
  UpcomingPick,
  RecentResults,
  TrackRecord,
  NewsResponse,
  OpponentsResponse,
  RecordBookResponse,
  CancelledFightsResponse,
  MatchmakingRequest,
  MatchmakingResponse,
  ModelInfo,
  OrgEvent,
  OrgFighter,
  OrgRankingCategory,
  PredictionResponse,
  RankingCategory,
} from '../types/api'

// Every request carries the build id, so each deploy starts with fresh answers instead of whatever the browser cached
// from the previous one (the API caches for up to an hour).
const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 60000,
  params: { v: BUILD_ID },
})

// Several parts of one page ask for the same thing at the same moment: the header, the page and a card each want the
// health check, the model figures or the picks. One request serves them all. Nothing is kept afterwards: once the
// request settles, the next call asks the server (or the browser cache) again.
const inFlight = new Map<string, Promise<unknown>>()

function shared<T>(key: string, request: () => Promise<T>): Promise<T> {
  const running = inFlight.get(key)
  if (running) return running as Promise<T>
  const promise = request().finally(() => inFlight.delete(key))
  inFlight.set(key, promise)
  return promise
}

/** Asks for a long list as columns (see columns.ts). */
const COLUMNS = { columns: true }

export const getFighters = async () => {
  const response = await api.get<FighterProfile[] | Columns>('/fighters', { params: { ufc_only: true, ...COLUMNS } })
  return rowsFrom(response.data)
}

export const getPhotoCredits = () =>
  shared('/photo-credits', async () => {
    const response = await api.get<{ credits: Record<string, string[]> }>('/photo-credits')
    return response.data
  })

export const getEvents = async () => {
  const response = await api.get<EventSummary[] | EventColumns>('/events', { params: COLUMNS })
  return eventsFrom(response.data)
}

export const getUpcomingEvents = async () => {
  const response = await api.get<EventSummary[]>('/events/upcoming')
  return response.data
}

export const getRankings = async () => {
  const response = await api.get<RankingCategory[]>('/rankings')
  return response.data
}

export const getDivisionMatrix = async (category: string, top = 8) => {
  const response = await api.get<DivisionMatrix>('/predict/division', { params: { category, top } })
  return response.data
}

export const getUpcomingPicks = () =>
  shared('/predict/upcoming', async () => {
    const response = await api.get<UpcomingPick[]>('/predict/upcoming')
    return response.data
  })

export const getRecentResults = async (days: number) => {
  const response = await api.get<RecentResults>('/results/recent', { params: { days } })
  return response.data
}

export const getTrackRecord = async () => {
  const response = await api.get<TrackRecord>('/track-record')
  return response.data
}

export const getNews = async (limit = 6) => {
  const response = await api.get<NewsResponse>('/news', { params: { limit } })
  return response.data
}

export const getRecordBook = async () => {
  const response = await api.get<RecordBookResponse>('/record-book')
  return response.data
}

export const getCancelledFights = async () => {
  const response = await api.get<CancelledFightsResponse>('/cancelled-fights')
  return response.data
}

export const getMatchmaking = async (request: MatchmakingRequest) => {
  const response = await api.post<MatchmakingResponse>('/game/matchmaking', request)
  return response.data
}

export const getChampions = async () => {
  const response = await api.get<ChampionsResponse>('/champions')
  return response.data
}

export const getOpponents = async (fighter: string) => {
  const response = await api.get<OpponentsResponse>(`/fighters/${encodeURIComponent(fighter)}/opponents`)
  return response.data.opponents
}

export const getHeadToHead = async (fighterA: string, fighterB: string) => {
  const response = await api.get<HeadToHeadResponse>('/head-to-head', {
    params: { fighter_a: fighterA, fighter_b: fighterB },
  })
  return response.data
}

export const getFighterPerformance = async (fighterName: string) => {
  const response = await api.get<FighterPerformance>(`/fighters/${encodeURIComponent(fighterName)}/performance`)
  return response.data
}

export const getOtherOrganizations = async (fighterName: string) => {
  const response = await api.get<OtherOrganization[]>(`/fighters/${encodeURIComponent(fighterName)}/other-organizations`)
  return response.data
}

export const getModelRecord = async (fighterName: string) => {
  const response = await api.get<FighterModelRecord>(`/fighters/${encodeURIComponent(fighterName)}/model-record`)
  return response.data
}

export const getSurprises = async () => {
  const response = await api.get<Surprises>('/track-record/surprises')
  return response.data
}

export const getModelInfo = () =>
  shared('/model-info', async () => {
    const response = await api.get<ModelInfo>('/model-info')
    return response.data
  })

export const getHealth = () =>
  shared('/health', async () => {
    const response = await api.get<HealthInfo>('/health', { timeout: 20000 })
    return response.data
  })

/** Keep pinging for a while so a brief restart of the server does not show up as an outage. */
export const waitForHealth = async (attempts = 8) => {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await getHealth()
    } catch (requestError) {
      lastError = requestError
      await new Promise((resolve) => setTimeout(resolve, Math.min(3000 * (attempt + 1), 10000)))
    }
  }
  throw lastError
}

export const getDataInfo = () =>
  shared('/data-info', async () => {
    const response = await api.get<DataInfo>('/data-info')
    return response.data
  })

export const predictFight = async (fighter_a_name: string, fighter_b_name: string) => {
  const response = await api.post<PredictionResponse>('/predict', {
    fighter_a: fighter_a_name,
    fighter_b: fighter_b_name,
  })
  return response.data
}

// Organizations other than the UFC share one set of endpoints, /orgs/{id}/...

export const getOrgFighters = async (org: string) => {
  const response = await api.get<OrgFighter[] | Columns>(`/orgs/${org}/fighters`, { params: COLUMNS })
  return rowsFrom(response.data)
}

export const getOrgEvents = async (org: string) => {
  const response = await api.get<OrgEvent[] | EventColumns>(`/orgs/${org}/events`, { params: COLUMNS })
  return eventsFrom(response.data)
}

export const getOrgUpcomingEvents = async (org: string) => {
  const response = await api.get<OrgEvent[]>(`/orgs/${org}/events/upcoming`)
  return response.data
}

export const getOrgRankings = async (org: string) => {
  const response = await api.get<OrgRankingCategory[]>(`/orgs/${org}/rankings`)
  return response.data
}

export const getOrgFighterFights = async (org: string, fighter: string) => {
  const response = await api.get<FightRecord[]>(`/orgs/${org}/fighters/${encodeURIComponent(fighter)}/fights`)
  return response.data
}

export const getOrgDataInfo = (org: string) =>
  shared(`/orgs/${org}/data-info`, async () => {
    const response = await api.get<DataInfo>(`/orgs/${org}/data-info`)
    return response.data
  })

export const getOrgUpcomingPicks = (org: string) =>
  shared(`/orgs/${encodeURIComponent(org)}/predict/upcoming`, async () => {
    const response = await api.get<UpcomingPick[]>(`/orgs/${encodeURIComponent(org)}/predict/upcoming`)
    return response.data
  })

// Gyms are shared by every organization: a gym is matched with the fighters of each one.

export const getGyms = async () => {
  const response = await api.get<GymSummary[]>('/gyms')
  return response.data
}

export const getGym = async (slug: string) => {
  const response = await api.get<GymDetail>(`/gyms/${encodeURIComponent(slug)}`)
  return response.data
}
