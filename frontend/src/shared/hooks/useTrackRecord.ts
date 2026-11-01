import { useCallback, useEffect, useState } from 'react'

import { getTrackRecord } from '../services/api'
import type { TrackRecord } from '../types/api'
import i18n from '../../i18n'
import { L } from '../../i18n/lang'

export function useTrackRecord() {
  const [data, setData] = useState<TrackRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getTrackRecord()
      setData(result)
      setError(null)
    } catch (requestError) {
      console.error(requestError)
      setError(L(i18n.language, 'Não foi possível carregar o histórico de desempenho da API.', 'Unable to load the track record from the API.', 'Impossible de charger le bilan du modèle depuis l’API.', 'No se pudo cargar el historial de aciertos desde la API.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    getTrackRecord()
      .then((result) => {
        if (!ignore) {
          setData(result)
          setError(null)
        }
      })
      .catch((requestError) => {
        if (!ignore) {
          console.error(requestError)
          setError(L(i18n.language, 'Não foi possível carregar o histórico de desempenho da API.', 'Unable to load the track record from the API.', 'Impossible de charger le bilan du modèle depuis l’API.', 'No se pudo cargar el historial de aciertos desde la API.'))
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })
    return () => {
      ignore = true
    }
  }, [])

  return { data, loading, error, reload }
}
