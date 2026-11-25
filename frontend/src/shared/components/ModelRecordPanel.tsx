import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'

import { L, formatDecimal, localeTag } from '../../i18n/lang'
import { formatProbability } from '../data/probability'
import { getModelRecord } from '../services/api'
import type { FighterModelRecord, FighterRecord } from '../types/api'

const FIRST_SHOWN = 4

function monthYear(day: string | null, lang: string): string {
  const date = day ? new Date(`${day}T00:00:00`) : null
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(localeTag(lang), { month: 'short', year: 'numeric' }) : '—'
}

/**
 * How the model has done on one fighter's fights: the test on past fights and the live picks, apart. Nothing is drawn for a
 * fighter with neither, or while it loads or fails: it adds to a profile and is never needed by it.
 */
export function ModelRecordPanel({ name }: { name: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [found, setFound] = useState<{ name: string; record: FighterModelRecord } | null>(null)

  useEffect(() => {
    let cancelled = false
    getModelRecord(name)
      .then((record) => {
        if (!cancelled) setFound({ name, record })
      })
      .catch((error) => console.error(error))
    return () => {
      cancelled = true
    }
  }, [name])

  const record = found?.name === name ? found.record : null
  if (!record || (!record.backtest && !record.live)) return null
  const title = L(lang, `O modelo e ${name}`, `The model and ${name}`, `Le modèle et ${name}`, `El modelo y ${name}`)
  return (
    <section aria-label={title} className="mt-6 border-t-[3px] border-[var(--ink)] pt-4">
      <h3 className="text-xl font-bold leading-tight">{title}</h3>
      {record.backtest ? (
        <Block
          title={L(
            lang,
            `Teste em lutas passadas (${monthYear(record.start, lang)} a ${monthYear(record.end, lang)})`,
            `Test on past fights (${monthYear(record.start, lang)} to ${monthYear(record.end, lang)})`,
            `Test sur des combats passés (${monthYear(record.start, lang)} à ${monthYear(record.end, lang)})`,
            `Prueba con peleas pasadas (${monthYear(record.start, lang)} a ${monthYear(record.end, lang)})`,
          )}
          note={L(
            lang,
            'Cada luta foi prevista por uma versão que só tinha visto lutas anteriores.',
            'Each fight was predicted by a version that had only seen earlier fights.',
            'Chaque combat a été prédit par une version qui n’avait vu que des combats antérieurs.',
            'Cada pelea la pronosticó una versión que solo había visto peleas anteriores.',
          )}
          record={record.backtest}
        />
      ) : null}
      {record.live ? (
        <Block
          title={L(lang, 'Palpites ao vivo', 'Live picks', 'Pronostics en direct', 'Pronósticos en vivo')}
          note={L(lang, 'Salvos antes de cada luta.', 'Saved before each fight.', 'Enregistrés avant chaque combat.', 'Guardados antes de cada pelea.')}
          record={record.live}
        />
      ) : null}
    </section>
  )
}

function Block({ title, note, record }: { title: string; note: string; record: FighterRecord }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [all, setAll] = useState(false)
  const shown = all ? record.picks : record.picks.slice(0, FIRST_SHOWN)
  const { fights, correct, wins } = record
  const expected = formatDecimal(record.expected_wins, 1, lang)
  const percent = (value: number) => `${Math.round(value * 100)}%`

  return (
    <div className="mt-4">
      <h4 className="text-base font-bold">{title}</h4>
      <p className="mt-1 max-w-[70ch] text-[15px] leading-6">
        {fights === 1
          ? correct
            ? L(lang, 'Acertou a única luta.', 'Right on the only fight.', 'Juste sur le seul combat.', 'Acertó la única pelea.')
            : L(lang, 'Errou a única luta.', 'Wrong on the only fight.', 'Faux sur le seul combat.', 'Falló la única pelea.')
          : L(
              lang,
              `Acertou ${correct} de ${fights} lutas. O modelo esperava ${expected} vitórias; foram ${wins}.`,
              `Right on ${correct} of ${fights} fights. The model expected ${expected} wins; there were ${wins}.`,
              `Juste sur ${correct} combats sur ${fights}. Le modèle attendait ${expected} victoires ; il y en a eu ${wins}.`,
              `Acertó ${correct} de ${fights} peleas. El modelo esperaba ${expected} victorias; fueron ${wins}.`,
            )}{' '}
        {fights >= 5 && record.accuracy_low != null && record.accuracy_high != null
          ? L(
              lang,
              `Com tão poucas lutas, o acerto real pode estar entre ${percent(record.accuracy_low)} e ${percent(record.accuracy_high)}.`,
              `With so few fights, the true hit rate could be between ${percent(record.accuracy_low)} and ${percent(record.accuracy_high)}.`,
              `Avec si peu de combats, la vraie précision peut se situer entre ${percent(record.accuracy_low)} et ${percent(record.accuracy_high)}.`,
              `Con tan pocas peleas, el acierto real puede estar entre ${percent(record.accuracy_low)} y ${percent(record.accuracy_high)}.`,
            )
          : L(
              lang,
              'São poucas lutas para julgar o modelo com este atleta.',
              'Too few fights to judge the model on this athlete.',
              'Trop peu de combats pour juger le modèle sur cet athlète.',
              'Son pocas peleas para juzgar al modelo con este atleta.',
            )}
      </p>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{note}</p>
      <ul className="mt-2 border-t border-[var(--rule)]">
        {shown.map((pick) => (
          <li key={`${pick.date}-${pick.opponent}`} className="flex items-center gap-3 border-b border-[var(--rule)] py-2.5">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center ${pick.correct ? 'border-[1.5px] border-[var(--ink)]' : 'bg-[var(--ink)] text-[var(--on-ink)]'}`}
              title={pick.correct ? L(lang, 'O modelo acertou', 'The model was right', 'Le modèle avait raison', 'El modelo acertó') : L(lang, 'O modelo errou', 'The model was wrong', 'Le modèle s’est trompé', 'El modelo falló')}
            >
              {pick.correct ? <Check className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
              <span className="sr-only">{pick.correct ? L(lang, 'Acerto', 'Right', 'Juste', 'Acierto') : L(lang, 'Erro', 'Wrong', 'Faux', 'Error')}</span>
            </span>
            <span className="min-w-0 flex-1 text-[15px] leading-6">
              <span className="font-semibold">vs. {pick.opponent}</span>
              <span className="block text-[var(--muted)]">
                {L(lang, 'Chance de vitória dada', 'Win chance given', 'Chance de victoire donnée', 'Probabilidad de ganar dada')}: {formatProbability(pick.chance)} · {pick.won ? L(lang, 'vitória', 'win', 'victoire', 'victoria') : L(lang, 'derrota', 'loss', 'défaite', 'derrota')} · {monthYear(pick.date, lang)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {record.picks.length > FIRST_SHOWN ? (
        <button type="button" onClick={() => setAll((current) => !current)} aria-expanded={all} className="ghost-action mt-3 inline-flex min-h-11 cursor-pointer items-center px-4 text-sm">
          {all
            ? L(lang, 'Mostrar menos', 'Show fewer', 'Afficher moins', 'Mostrar menos')
            : L(lang, `Mostrar as ${record.picks.length} lutas`, `Show all ${record.picks.length} fights`, `Afficher les ${record.picks.length} combats`, `Mostrar las ${record.picks.length} peleas`)}
        </button>
      ) : null}
    </div>
  )
}
