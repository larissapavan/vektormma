import { useEffect, useState } from 'react'

import { getCancelledFights } from '../services/api'
import type { CancelledFight } from '../types/api'
import i18n from '../../i18n'
import { L } from '../../i18n/lang'

export function useCancelledFights() {
  const [fights, setFights] = useState<CancelledFight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getCancelledFights()
      .then((data) => active && setFights(data.fights))
      .catch((requestError) => {
        console.error(requestError)
        if (active) {
          setError(
            L(
              i18n.language,
              'Não foi possível carregar as lutas canceladas da API.',
              'Unable to load the cancelled fights from the API.',
              'Impossible de charger les combats annulés depuis l’API.',
              'No se pudieron cargar las peleas canceladas desde la API.',
            ),
          )
        }
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { fights, loading, error }
}
