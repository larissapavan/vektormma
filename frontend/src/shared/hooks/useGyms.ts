import { getGym, getGyms } from '../services/api'
import type { GymDetail, GymSummary } from '../types/api'
import { useOrgResource } from './useOrgData'
import i18n from '../../i18n'
import { L } from '../../i18n/lang'

const NO_GYMS: GymSummary[] = []

/** Every gym, the biggest first. Requested once and shared by the pages that need it. */
export function useGyms() {
  const { data, loading, error } = useOrgResource('gyms', getGyms, L(i18n.language, 'Não foi possível carregar as academias da API.', 'Unable to load gyms from the API.', 'Impossible de charger les salles depuis l’API.', 'No se pudieron cargar los gimnasios desde la API.'), NO_GYMS)
  return { gyms: data, loading, error }
}

export function useGym(slug: string) {
  const { data, loading, error } = useOrgResource<GymDetail | null>(`gym:${slug}`, () => getGym(slug), L(i18n.language, 'Não foi possível carregar esta academia.', 'Unable to load this gym.', 'Impossible de charger cette salle.', 'No se pudo cargar este gimnasio.'), null)
  return { gym: data, loading, error }
}
