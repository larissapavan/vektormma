import { orgEs, orgFr, orgPt } from '../data/orgs'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { getOtherOrganizations } from '../services/api'
import type { OtherOrganization } from '../types/api'
import { OrgFightLine } from './OrgFightLine'

const FIRST_SHOWN = 4

/**
 * What a UFC fighter did in the PFL or Bellator, under their UFC history. Nothing is drawn for a fighter who never
 * fought elsewhere, or while it loads or fails: it adds to a profile and is never needed by it. These fights are
 * shown, not counted: the UFC numbers above (record, trends, the model's inputs) stay what the UFC pipeline says.
 */
export function OtherOrganizationsPanel({ name }: { name: string }) {
  const { i18n } = useTranslation()
  const [found, setFound] = useState<OtherOrganization[]>([])

  useEffect(() => {
    let cancelled = false
    getOtherOrganizations(name)
      .then((data) => {
        if (!cancelled) setFound(data)
      })
      .catch((error) => console.error(error))
    return () => {
      cancelled = true
    }
  }, [name])

  if (found.length === 0) return null
  return (
    <section aria-label={L(i18n.language, 'Lutas em outras organizações', 'Fights in other organizations', 'Combats dans d’autres organisations', 'Peleas en otras organizaciones')} className="mt-3 space-y-3">
      {found.map((item) => (
        <OrgHistory key={item.org_id} item={item} />
      ))}
    </section>
  )
}

function OrgHistory({ item }: { item: OtherOrganization }) {
  const { i18n } = useTranslation()
  const [all, setAll] = useState(false)
  const shown = all ? item.fights : item.fights.slice(0, FIRST_SHOWN)
  const other = { id: item.org_id, shortName: item.short_name }
  return (
    <div className="metric-tile p-3">
      <p className="broadcast-label text-label text-[var(--text-muted)]">
        {L(
          i18n.language,
          `Também lutou ${orgPt(other, 'em')}${item.org_record ? ` · ${item.org_record} por lá` : ''}`,
          `Also fought in the ${item.short_name}${item.org_record ? ` · ${item.org_record} there` : ''}`,
          `A aussi combattu ${orgFr(other, 'à')}${item.org_record ? ` · ${item.org_record} là-bas` : ''}`,
          `También peleó en ${orgEs(other)}${item.org_record ? ` · ${item.org_record} allí` : ''}`,
        )}
      </p>
      <ul className="mt-2 space-y-2">
        {shown.map((fight) => (
          <OrgFightLine key={`${fight.fight_url}-${fight.opponent}`} fight={fight} knownOpponent={false} onSelect={() => undefined} />
        ))}
      </ul>
      {item.fights.length > FIRST_SHOWN ? (
        <button
          type="button"
          onClick={() => setAll((current) => !current)}
          aria-expanded={all}
          className="ghost-action mt-2 px-3 py-1.5 text-label font-bold text-[#FFFFFF]"
        >
          {all
            ? L(i18n.language, 'Mostrar menos', 'Show fewer', 'Afficher moins', 'Mostrar menos')
            : L(i18n.language, `Mostrar todas as ${item.fights.length} lutas ${orgPt(other, 'em')}`, `Show all ${item.fights.length} ${item.short_name} fights`, `Afficher les ${item.fights.length} combats ${item.short_name}`, `Mostrar las ${item.fights.length} peleas en ${orgEs(other)}`)}
        </button>
      ) : null}
      <p className="theme-muted mt-2 text-label leading-4">
        {L(
          i18n.language,
          'Exibido para contexto completo. O cartel, tendências e palpites do modelo acima consideram apenas lutas do UFC.',
          'Shown for the full picture. The UFC record, trends and the model\'s picks above count UFC fights only.',
          'Affiché pour le contexte complet. Le palmarès UFC, les tendances et les pronostics du modèle ci-dessus ne comptent que les combats UFC.',
          'Se muestra para tener el panorama completo. El récord de la UFC, las tendencias y los pronósticos del modelo de arriba cuentan solo peleas de la UFC.',
        )}
      </p>
    </div>
  )
}
