import { useEffect, useState } from 'react'

import { getEvents } from '../services/api'
import type { EventSummary } from '../types/api'
import i18n from '../../i18n'
import { L } from '../../i18n/lang'

export function useEvents() {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getEvents()
        setEvents(data)
      } catch (requestError) {
        console.error(requestError)
        setError(L(i18n.language, 'Não foi possível carregar os eventos da API.', 'Unable to load events from the API.', 'Impossible de charger les événements depuis l’API.', 'No se pudieron cargar los eventos desde la API.'))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return { events, loading, error }
}
