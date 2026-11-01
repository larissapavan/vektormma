import { useEffect, useState } from 'react'

import { getRecordBook } from '../services/api'
import type { RecordBookResponse } from '../types/api'
import i18n from '../../i18n'
import { L } from '../../i18n/lang'

export function useRecordBook() {
  const [data, setData] = useState<RecordBookResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setData(await getRecordBook())
      } catch (requestError) {
        console.error(requestError)
        setError(L(i18n.language, 'Não foi possível carregar o livro de recordes da API.', 'Unable to load the record book from the API.', 'Impossible de charger le livre des records depuis l’API.', 'No se pudo cargar el libro de récords desde la API.'))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return { data, loading, error }
}
