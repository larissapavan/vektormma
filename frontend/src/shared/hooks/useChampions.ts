import { useEffect, useState } from 'react'

import { getChampions } from '../services/api'
import type { ChampionsResponse } from '../types/api'
import i18n from '../../i18n'
import { L } from '../../i18n/lang'

export function useChampions() {
  const [data, setData] = useState<ChampionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getChampions()
        setData(response)
      } catch (requestError) {
        console.error(requestError)
        setError(L(i18n.language, 'Não foi possível carregar os campeões da API.', 'Unable to load champions from the API.', 'Impossible de charger les champions depuis l’API.', 'No se pudieron cargar los campeones desde la API.'))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return { data, loading, error }
}
