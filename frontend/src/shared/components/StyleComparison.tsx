import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { getDivisionName } from '../data/divisions'
import { STYLE_METRICS, styleNotes, styleOf, stylePools, type StyleRow } from '../data/style'
import { useFighters } from '../hooks/useFighters'
import type { FighterProfile } from '../types/api'

/**
 * Both fighters on the same scale, figure by figure: where each stands among the active fighters of their division. Two lanes,
 * so the marks never cover each other; the values are written, so nothing depends on colour or on hovering.
 */
export function StyleComparison({ fighterA, fighterB }: { fighterA: FighterProfile; fighterB: FighterProfile }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { fighters } = useFighters()
  const pools = useMemo(() => stylePools(fighters), [fighters])
  const styleA = useMemo(() => styleOf(fighterA, pools), [fighterA, pools])
  const styleB = useMemo(() => styleOf(fighterB, pools), [fighterB, pools])
  const notes = useMemo(() => styleNotes(fighterA, fighterB, pools, lang), [fighterA, fighterB, pools, lang])

  const rows = STYLE_METRICS.filter((metric) => styleA[metric.key].value != null || styleB[metric.key].value != null)
  if (!rows.length) return null
  const sameDivision = fighterA.division === fighterB.division
  const division = (fighter: FighterProfile) => (fighter.division ? getDivisionName(fighter.division, lang) : '—')

  return (
    <section className="rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <h2 className="text-2xl leading-none">{L(lang, 'Comparação de estilos', 'Style comparison', 'Comparaison des styles', 'Comparación de estilos')}</h2>
      <p className="mt-2 max-w-[70ch] text-[15px] leading-6 text-[var(--muted)]">
        {sameDivision
          ? L(lang, `Onde cada um fica entre os lutadores ativos da divisão (${division(fighterA)}). O traço do meio é a mediana.`, `Where each stands among the active fighters of the division (${division(fighterA)}). The middle line is the median.`, `Où chacun se situe parmi les combattants actifs de la catégorie (${division(fighterA)}). Le trait du milieu est la médiane.`, `Dónde queda cada uno entre los peleadores activos de la división (${division(fighterA)}). La línea del medio es la mediana.`)
          : L(lang, `Onde cada um fica entre os lutadores ativos da própria divisão (${division(fighterA)} e ${division(fighterB)}). O traço do meio é a mediana.`, `Where each stands among the active fighters of their own division (${division(fighterA)} and ${division(fighterB)}). The middle line is the median.`, `Où chacun se situe parmi les combattants actifs de sa propre catégorie (${division(fighterA)} et ${division(fighterB)}). Le trait du milieu est la médiane.`, `Dónde queda cada uno entre los peleadores activos de su propia división (${division(fighterA)} y ${division(fighterB)}). La línea del medio es la mediana.`)}
      </p>
      <div className="mt-4 flex flex-wrap justify-between gap-x-6 gap-y-1 text-base font-bold">
        <span className="inline-flex items-center gap-2"><Mark side="a" /> {fighterA.name}</span>
        <span className="inline-flex items-center gap-2"><Mark side="b" /> {fighterB.name}</span>
      </div>
      <dl className="mt-2 border-t border-[var(--rule)]">
        {rows.map((metric) => {
          const a = styleA[metric.key]
          const b = styleB[metric.key]
          return (
            <div key={metric.key} className="border-b border-[var(--rule)] py-3">
              <dt className="text-center text-[15px] font-semibold">{metric.label(lang)}</dt>
              <dd className="mt-1 flex items-baseline justify-between gap-4">
                <Figure row={a} text={a.value == null ? '—' : metric.format(a.value, lang)} lang={lang} />
                <Figure row={b} text={b.value == null ? '—' : metric.format(b.value, lang)} lang={lang} right />
              </dd>
              <dd className="relative mx-2 mt-2 h-7" aria-hidden="true">
                <span className="absolute inset-x-0 top-1/2 h-px bg-[var(--border-mid)]" />
                <span className="absolute left-1/2 top-0 h-full w-px bg-[var(--border-mid)]" />
                {a.percentile != null ? <span className="absolute top-0 -translate-x-1/2" style={{ left: `${a.percentile}%` }}><Mark side="a" /></span> : null}
                {b.percentile != null ? <span className="absolute bottom-0 -translate-x-1/2" style={{ left: `${b.percentile}%` }}><Mark side="b" /></span> : null}
              </dd>
            </div>
          )
        })}
      </dl>
      <div className="mt-4">
        <h3 className="text-base font-bold">{L(lang, 'Onde os estilos se chocam', 'Where the styles meet', 'Là où les styles s’opposent', 'Dónde chocan los estilos')}</h3>
        <ul className="mt-2 grid max-w-[70ch] gap-2 text-base leading-7">
          {notes.length ? (
            notes.map((note) => <li key={note}>{note}</li>)
          ) : (
            <li>{L(lang, 'Nenhum contraste forte entre o ataque de um e a defesa do outro nesses números.', 'No strong contrast between one’s attack and the other’s defense in these numbers.', 'Aucun contraste net entre l’attaque de l’un et la défense de l’autre dans ces chiffres.', 'Ningún contraste fuerte entre el ataque de uno y la defensa del otro en estos números.')}</li>
          )}
        </ul>
        <p className="mt-3 max-w-[70ch] text-sm leading-6 text-[var(--muted)]">
          {L(lang, 'É uma leitura dos números de carreira, não a opinião do modelo. Um traço (—) indica que o dado não foi medido.', 'This reads the career numbers; it is not the model’s opinion. A dash (—) means the figure was not measured.', 'C’est une lecture des chiffres de carrière, pas l’avis du modèle. Un tiret (—) signale une donnée non mesurée.', 'Es una lectura de los números de carrera, no la opinión del modelo. Un guion (—) indica que el dato no se midió.')}
        </p>
      </div>
    </section>
  )
}

/** The corner's mark: a diamond for red, a square for blue, so the pair does not rest on colour alone. */
function Mark({ side }: { side: 'a' | 'b' }) {
  return <span aria-hidden="true" className={`block h-3 w-3 shrink-0 ring-2 ring-[var(--bg-surface)] ${side === 'a' ? 'rotate-45 bg-[var(--red)]' : 'bg-[var(--blue)]'}`} />
}

function Figure({ row, text, lang, right = false }: { row: StyleRow; text: string; lang: string; right?: boolean }) {
  return (
    <span className={`min-w-0 ${right ? 'text-right' : ''}`}>
      <span className="font-display text-xl font-extrabold tabular-nums">{text}</span>
      {row.percentile != null ? (
        <span className="block text-sm leading-5 text-[var(--muted)]">
          {L(lang, `acima de ${row.percentile}%`, `above ${row.percentile}%`, `au-dessus de ${row.percentile} %`, `por encima del ${row.percentile} %`)}
        </span>
      ) : null}
    </span>
  )
}
