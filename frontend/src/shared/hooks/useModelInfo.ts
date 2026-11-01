import { useEffect, useState } from 'react'

import { getModelInfo, waitForHealth } from '../services/api'
import type { HealthInfo, ModelInfo } from '../types/api'
import i18n from '../../i18n'
import { L } from '../../i18n/lang'

export function useModelInfo() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [health, setHealth] = useState<HealthInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const healthData = await waitForHealth()
        setHealth(healthData)
        setLoading(false)
        try {
          const info = await getModelInfo()
          setModelInfo(info)
        } catch {
          // Health can come up before the model bundle is ready.
        }
      } catch {
        setError(L(i18n.language, 'Não foi possível carregar as informações do sistema no servidor.', 'Unable to load system information from the backend.', 'Impossible de charger les informations du système depuis le serveur.', 'No se pudo cargar la información del sistema desde el servidor.'))
        setLoading(false)
      }
    }

    void load()
  }, [])

  return { modelInfo, health, loading, error }
}
