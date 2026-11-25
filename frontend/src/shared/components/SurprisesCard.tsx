import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Shuffle } from 'lucide-react'

import { L, formatDecimal } from '../../i18n/lang'
import { athletePath } from '../../seo/athletes'
import { getSurprises } from '../services/api'
import type { Surprises, SurpriseRow } from '../types/api'

/** Who won most, and least, against what the model expected of them in the test. Nothing while it loads or if it fails. */
export function SurprisesCard() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [data, setData] = useState<Surprises | null>(null)

  useEffect(() => {
    let cancelled = false
    getSurprises()
      .then((found) => {
        if (!cancelled) setData(found)
      })
      .catch((error) => console.error(error))
    return () => {
      cancelled = true
    }
  }, [])

  if (!data || (!data.underrated.length && !data.overrated.length)) return null
  return (
    <section className="border-t-[3px] border-[var(--ink)] pt-4">
      <div className="flex items-center gap-2">
        <Shuffle className="h-5 w-5 shrink-0" aria-hidden="true" />
        <h2 className="section-title">{L(lang, 'Quem mais surpreendeu o modelo', 'Who surprised the model most', 'Qui a le plus surpris le modèle', 'Quién sorprendió más al modelo')}</h2>
      </div>
      <p className="mt-1 max-w-[70ch] text-[15px] text-[var(--muted)]">
        {L(
          lang,
          `No teste em lutas passadas, entre os ${data.fighters} atletas com ${data.min_fights} lutas ou mais: as vitórias que vieram e as que o modelo esperava. Com tantos atletas e poucas lutas de cada um, parte disso é acaso.`,
          `In the test on past fights, among the ${data.fighters} athletes with ${data.min_fights} fights or more: the wins that came and the ones the model expected. With so many athletes and few fights each, part of this is chance.`,
          `Dans le test sur des combats passés, parmi les ${data.fighters} athlètes ayant ${data.min_fights} combats ou plus : les victoires obtenues et celles que le modèle attendait. Avec autant d’athlètes et peu de combats chacun, une part relève du hasard.`,
          `En la prueba con peleas pasadas, entre los ${data.fighters} atletas con ${data.min_fights} peleas o más: las victorias que llegaron y las que el modelo esperaba. Con tantos atletas y pocas peleas cada uno, parte de esto es azar.`,
        )}
      </p>
      <div className="mt-3 grid gap-x-10 gap-y-6 lg:grid-cols-2">
        <Column title={L(lang, 'Venceram mais que o esperado', 'Won more than expected', 'Plus de victoires que prévu', 'Ganaron más de lo esperado')} rows={data.underrated} />
        <Column title={L(lang, 'Venceram menos que o esperado', 'Won less than expected', 'Moins de victoires que prévu', 'Ganaron menos de lo esperado')} rows={data.overrated} />
      </div>
    </section>
  )
}

function Column({ title, rows }: { title: string; rows: SurpriseRow[] }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <div>
      <h3 className="text-base font-bold">{title}</h3>
      <ul className="mt-1 border-t border-[var(--rule)]">
        {rows.map((row) => {
          const expected = formatDecimal(row.expected_wins, 1, lang)
          const won = row.wins === 1 ? L(lang, '1 vitória', '1 win', '1 victoire', '1 victoria') : L(lang, `${row.wins} vitórias`, `${row.wins} wins`, `${row.wins} victoires`, `${row.wins} victorias`)
          return (
            <li key={row.fighter} className="flex items-baseline justify-between gap-4 border-b border-[var(--rule)]">
              <Link to={athletePath(row.fighter)} className="inline-flex min-h-11 min-w-0 items-center text-base font-semibold underline decoration-[var(--rule)] underline-offset-4 hover:decoration-[var(--ink)]">
                {row.fighter}
              </Link>
              <span className="shrink-0 text-right text-[15px] tabular-nums">
                {L(lang, `${won} (esperadas ${expected})`, `${won} (${expected} expected)`, `${won} (${expected} attendues)`, `${won} (${expected} esperadas)`)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
