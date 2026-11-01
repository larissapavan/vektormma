import { useEffect, useState } from 'react'

import { getUpcomingEvents } from '../services/api'
import type { EventSummary } from '../types/api'
import i18n from '../../i18n'
import { L } from '../../i18n/lang'

export function useUpcomingEvents() {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getUpcomingEvents()
        setEvents(data)
      } catch (requestError) {
        console.error(requestError)
        setError(L(i18n.language, 'Não foi possível carregar os próximos eventos da API.', 'Unable to load upcoming events from the API.', 'Impossible de charger les prochains événements depuis l’API.', 'No se pudieron cargar los próximos eventos desde la API.'))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return { events, loading, error }
}
