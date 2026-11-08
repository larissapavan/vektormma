import { useEffect, useState } from 'react'

import i18n from '../../i18n'
import { L } from '../../i18n/lang'
import { getRecentResults } from '../services/api'
import type { RecentResults } from '../types/api'

/** The results of the last `days` days, from every organization. Changing `days` loads again. */
export function useRecentResults(days: number) {
  const [data, setData] = useState<RecentResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    getRecentResults(days)
      .then((result) => {
        if (ignore) return
        setData(result)
        setError(null)
      })
      .catch((requestError) => {
        if (ignore) return
        console.error(requestError)
        setError(L(i18n.language, 'Não foi possível carregar os resultados recentes da API.', 'Unable to load the recent results from the API.', 'Impossible de charger les résultats récents depuis l’API.', 'No se pudieron cargar los resultados recientes desde la API.'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [days])

  return { data, loading, error }
}
