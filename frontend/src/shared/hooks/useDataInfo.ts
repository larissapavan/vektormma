import { useEffect, useState } from 'react'

import { getDataInfo } from '../services/api'
import type { DataInfo } from '../types/api'
import i18n from '../../i18n'
import { L } from '../../i18n/lang'

export function useDataInfo() {
  const [dataInfo, setDataInfo] = useState<DataInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDataInfo()
        setDataInfo(data)
      } catch {
        setError(L(i18n.language, 'Não foi possível carregar as informações do fluxo de dados no servidor.', 'Unable to load data pipeline information from the backend.', 'Impossible de charger les informations sur la chaîne de données depuis le serveur.', 'No se pudo cargar la información del flujo de datos desde el servidor.'))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return { dataInfo, loading, error }
}
