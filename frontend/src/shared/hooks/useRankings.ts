import { useEffect, useState } from 'react'

import { getRankings } from '../services/api'
import type { RankingCategory } from '../types/api'
import i18n from '../../i18n'
import { L } from '../../i18n/lang'

export function useRankings() {
  const [rankings, setRankings] = useState<RankingCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getRankings()
        setRankings(data)
      } catch (requestError) {
        console.error(requestError)
        setError(L(i18n.language, 'Não foi possível carregar o ranking da API.', 'Unable to load rankings from the API.', 'Impossible de charger les classements depuis l’API.', 'No se pudo cargar el ranking desde la API.'))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return { rankings, loading, error }
}
