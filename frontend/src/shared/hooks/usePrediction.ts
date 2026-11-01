import { useCallback, useRef, useState } from 'react'

import { predictFight } from '../services/api'
import type { PredictionResponse } from '../types/api'
import i18n from '../../i18n'
import { L } from '../../i18n/lang'

export function usePrediction() {
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestId = useRef(0)

  const runPrediction = useCallback(async (fighterA: string, fighterB: string) => {
    const id = ++requestId.current
    try {
      setLoading(true)
      setError(null)
      const response = await predictFight(fighterA, fighterB)
      if (id !== requestId.current) return response
      setPrediction(response)
      return response
    } catch {
      if (id === requestId.current) {
        setError(L(i18n.language, 'A análise do combate falhou. Verifique se o servidor está funcionando corretamente.', 'Fight analysis failed. Check whether the backend is running correctly.', 'L’analyse du combat a échoué. Vérifiez que le serveur fonctionne correctement.', 'Falló el análisis de la pelea. Comprueba que el servidor funcione correctamente.'))
      }
      return null
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  return { prediction, loading, error, runPrediction, setPrediction }
}
