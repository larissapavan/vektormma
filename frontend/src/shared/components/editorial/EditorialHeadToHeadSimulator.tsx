import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { L, localeTag } from '../../../i18n/lang'
import { getDivisionName } from '../../data/divisions'
import { localizeFeature } from '../../utils/localizeFeature'
import { getFighterImageUrl, useFighterImages } from '../../hooks/useFighterImages'
import { useFighters } from '../../hooks/useFighters'
import { usePrediction } from '../../hooks/usePrediction'
import { DataConfidenceNote } from '../DataConfidenceNote'
import { FighterAvatar } from '../FighterAvatar'
import { CornerSplit, cornerPhotoClass } from '../ui/CornerSplit'
import { predictionSentence, ProbabilityBand } from '../ui/ProbabilityBand'
import { sectionActionClass } from '../ui/Section'
import type { FighterProfile, HeadToHeadResponse, UpcomingPick } from '../../types/api'

interface EditorialHeadToHeadSimulatorProps {
  /** The red corner. */
  fighterA: string
  /** The blue corner. */
  fighterB: string
  onSelectFighterA: (name: string) => void
  onSelectFighterB: (name: string) => void
  /** Fights already on a card, offered as a starting point while a corner is empty. */
  scheduled?: UpcomingPick[]
  /** The two fighters' shared history, when it has been loaded. */
  history?: HeadToHeadResponse | null
}

type Side = 'a' | 'b'

/**
 * The tale of the tape: the two corners side by side, the model's estimate in a band, the fighters' numbers side by side,
 * the factors behind the estimate and the opponents they share. With a corner empty it asks for two names instead.
 */
export function EditorialHeadToHeadSimulator({
  fighterA,
  fighterB,
  onSelectFighterA,
  onSelectFighterB,
  scheduled = [],
  history = null,
}: EditorialHeadToHeadSimulatorProps) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { fighters } = useFighters()
  const { imageByName } = useFighterImages()
  const { prediction, runPrediction } = usePrediction()
  const [selecting, setSelecting] = useState<Side | null>(null)

  const profileOf = (name: string) => fighters.find((f) => f.name.toLowerCase() === name.toLowerCase()) ?? null
  const profileA = useMemo(() => profileOf(fighterA), [fighters, fighterA]) // eslint-disable-line react-hooks/exhaustive-deps
  const profileB = useMemo(() => profileOf(fighterB), [fighters, fighterB]) // eslint-disable-line react-hooks/exhaustive-deps

  const matchupReady = Boolean(fighterA && fighterB && fighterA.toLowerCase() !== fighterB.toLowerCase())

  useEffect(() => {
    if (matchupReady) void runPrediction(fighterA, fighterB)
  }, [matchupReady, fighterA, fighterB, runPrediction])

  const choose = (side: Side, name: string) => (side === 'a' ? onSelectFighterA(name) : onSelectFighterB(name))
  const redLabel = L(lang, 'Canto vermelho', 'Red corner', 'Coin rouge', 'Esquina roja')
  const blueLabel = L(lang, 'Canto azul', 'Blue corner', 'Coin bleu', 'Esquina azul')

  if (!matchupReady) {
    return <EmptyMatchup fighterA={fighterA} fighterB={fighterB} onChoose={choose} scheduled={scheduled} />
  }

  // The prediction belongs to these two only once it answers for them (it may still be the previous pair's).
  const current = prediction && prediction.fighter_a_profile.name.toLowerCase() === fighterA.toLowerCase() && prediction.fighter_b_profile.name.toLowerCase() === fighterB.toLowerCase() ? prediction : null
  const photo = (name: string, profile: FighterProfile | null) => (
    <FighterAvatar name={name} imageUrl={getFighterImageUrl(name, imageByName, profile?.image_url)} className={cornerPhotoClass} />
  )
  const change = (side: Side) => (
    <button
      type="button"
      onClick={() => setSelecting(side)}
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border-[1.5px] border-white px-4 text-[15px] font-bold text-white hover:bg-white/20"
    >
      {L(lang, 'Trocar lutador', 'Change fighter', 'Changer de combattant', 'Cambiar peleador')}
      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  )

  return (
    <div>
      <CornerSplit
        headingLevel="h2"
        red={{ name: fighterA, label: redLabel, photo: photo(fighterA, profileA), action: change('a') }}
        blue={{ name: fighterB, label: blueLabel, photo: photo(fighterB, profileB), action: change('b') }}
      />
      {current ? (
        <>
          <ProbabilityBand nameA={fighterA} nameB={fighterB} probabilityA={current.fighter_a_probability} />
          <p className="mt-4 max-w-[70ch] text-base sm:text-lg">{predictionSentence(lang, current.predicted_winner, current.probability)}</p>
          {current.data_confidence ? (
            <div className="mt-3 max-w-[70ch]">
              <DataConfidenceNote confidence={current.data_confidence} />
            </div>
          ) : null}
        </>
      ) : (
        <p className="flex h-[84px] items-center bg-[var(--panel)] px-7 text-base text-[var(--muted)]" role="status">
          {L(lang, 'Calculando a chance de vitória…', 'Working out the win chance…', 'Calcul de la chance de victoire…', 'Calculando la probabilidad de victoria…')}
        </p>
      )}

      <SideBySide profileA={profileA} profileB={profileB} />

      <section className="grid gap-x-[72px] gap-y-12 pt-16 lg:grid-cols-2">
        <div>
          <h2 className="text-[32px] leading-[1.05] sm:text-4xl">
            {current
              ? L(lang, `Por que o modelo prefere ${current.predicted_winner}`, `Why the model favours ${current.predicted_winner}`, `Pourquoi le modèle préfère ${current.predicted_winner}`, `Por qué el modelo prefiere a ${current.predicted_winner}`)
              : L(lang, 'O que pesa na previsão', 'What weighs on the prediction', 'Ce qui pèse dans le pronostic', 'Qué pesa en el pronóstico')}
          </h2>
          {current && current.main_factors.length ? (
            <ul className="mt-3 border-t-[3px] border-[var(--ink)]">
              {current.main_factors.slice(0, 4).map((factor) => (
                <li key={factor.feature} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--rule)] py-3.5">
                  <span className="text-base font-semibold">{localizeFeature(factor.feature, lang)}</span>
                  <span className="text-[15px] text-[var(--muted)]">{L(lang, `a favor de ${factor.impact}`, `in favour of ${factor.impact}`, `en faveur de ${factor.impact}`, `a favor de ${factor.impact}`)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-base text-[var(--muted)]">
              {L(lang, 'Os fatores aparecem quando o modelo terminar o cálculo.', 'The factors show once the model has finished.', 'Les facteurs s’affichent une fois le calcul terminé.', 'Los factores aparecen cuando el modelo termine el cálculo.')}
            </p>
          )}
          <p className="mt-4">
            <Link to="/model" className={sectionActionClass}>
              {L(lang, 'Entender como a previsão é feita', 'See how the prediction is made', 'Comprendre comment le pronostic est fait', 'Entender cómo se hace el pronóstico')}
            </Link>
          </p>
        </div>

        <CommonOpponents fighterA={fighterA} fighterB={fighterB} history={history} />
      </section>

      {selecting ? (
        <FighterPicker
          title={selecting === 'a' ? redLabel : blueLabel}
          exclude={selecting === 'a' ? fighterB : fighterA}
          onClose={() => setSelecting(null)}
          onPick={(name) => {
            choose(selecting, name)
            setSelecting(null)
          }}
        />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------------------------ */

type Row = { label: string; a: number | null; b: number | null; textA: string; textB: string }

/** "1,93 m" in the language on screen. */
function metres(cm: number | null | undefined, lang: string) {
  return cm ? `${(cm / 100).toLocaleString(localeTag(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m` : '—'
}

function percent(value: number | null | undefined, lang: string) {
  return value != null ? new Intl.NumberFormat(localeTag(lang), { style: 'percent', maximumFractionDigits: 0 }).format(value) : '—'
}

function record(profile: FighterProfile | null) {
  if (!profile || profile.wins == null) return '—'
  return `${profile.wins}-${profile.losses ?? 0}-${profile.draws ?? 0}`
}

/** The fighters' numbers, value / label / value, with bars that grow from the centre towards the larger value. */
function SideBySide({ profileA, profileB }: { profileA: FighterProfile | null; profileB: FighterProfile | null }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const decimal = (value: number | null | undefined) => (value != null ? value.toLocaleString(localeTag(lang), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—')

  const rows: Row[] = [
    { label: L(lang, 'Cartel', 'Record', 'Palmarès', 'Récord'), a: profileA?.win_rate ?? null, b: profileB?.win_rate ?? null, textA: record(profileA), textB: record(profileB) },
    { label: L(lang, 'Altura', 'Height', 'Taille', 'Estatura'), a: profileA?.height_cm ?? null, b: profileB?.height_cm ?? null, textA: metres(profileA?.height_cm, lang), textB: metres(profileB?.height_cm, lang) },
    { label: L(lang, 'Envergadura', 'Reach', 'Allonge', 'Alcance'), a: profileA?.reach_cm ?? null, b: profileB?.reach_cm ?? null, textA: metres(profileA?.reach_cm, lang), textB: metres(profileB?.reach_cm, lang) },
    { label: L(lang, 'Golpes por minuto', 'Strikes per minute', 'Coups par minute', 'Golpes por minuto'), a: profileA?.sig_strikes_landed_per_min ?? null, b: profileB?.sig_strikes_landed_per_min ?? null, textA: decimal(profileA?.sig_strikes_landed_per_min), textB: decimal(profileB?.sig_strikes_landed_per_min) },
    { label: L(lang, 'Precisão dos golpes', 'Striking accuracy', 'Précision des coups', 'Precisión de golpes'), a: profileA?.sig_str_acc ?? null, b: profileB?.sig_str_acc ?? null, textA: percent(profileA?.sig_str_acc, lang), textB: percent(profileB?.sig_str_acc, lang) },
    { label: L(lang, 'Defesa de quedas', 'Takedown defence', 'Défense de takedown', 'Defensa de derribos'), a: profileA?.takedown_defense ?? null, b: profileB?.takedown_defense ?? null, textA: percent(profileA?.takedown_defense, lang), textB: percent(profileB?.takedown_defense, lang) },
  ]

  return (
    <section className="pt-16">
      <h2 className="text-[32px] leading-[1.05] sm:text-[40px]">{L(lang, 'Lado a lado', 'Side by side', 'Côte à côte', 'Lado a lado')}</h2>
      <p className="mb-6 mt-1.5 text-base text-[var(--muted)]">
        {L(lang, 'A barra cresce a partir do centro, para o lado de quem tem o maior valor.', 'Each bar grows from the centre, towards whoever has the larger value.', 'Chaque barre part du centre, vers celui qui a la valeur la plus haute.', 'La barra crece desde el centro, hacia quien tiene el valor más alto.')}
      </p>
      <dl className="border-t-[3px] border-[var(--ink)]">
        {rows.map((row) => {
          const max = Math.max(row.a ?? 0, row.b ?? 0)
          const width = (value: number | null) => (value != null && max > 0 ? `${(value / max) * 100}%` : '0%')
          return (
            <div key={row.label} className="border-b border-[var(--rule)] py-3.5 sm:flex sm:items-center sm:gap-4 sm:py-4">
              <dt className="mb-2 text-center text-[15px] font-bold sm:order-2 sm:mb-0 sm:w-[180px] sm:shrink-0 sm:text-base">{row.label}</dt>
              <dd className="flex flex-1 items-center gap-2 sm:order-1 sm:gap-3.5">
                <span className="w-[68px] shrink-0 text-right font-display text-[22px] font-extrabold leading-none tabular-nums sm:w-24 sm:text-[30px]">{row.textA}</span>
                <span className="flex h-3 flex-1 justify-end bg-[var(--track)] sm:h-3.5" aria-hidden="true">
                  <span className="h-full bg-[var(--red)]" style={{ width: width(row.a) }} />
                </span>
                <span className="flex h-3 flex-1 bg-[var(--track)] sm:hidden" aria-hidden="true">
                  <span className="h-full bg-[var(--blue)]" style={{ width: width(row.b) }} />
                </span>
                <span className="w-[68px] shrink-0 font-display text-[22px] font-extrabold leading-none tabular-nums sm:hidden">{row.textB}</span>
              </dd>
              <dd className="hidden flex-1 items-center gap-3.5 sm:order-3 sm:flex">
                <span className="flex h-3.5 flex-1 bg-[var(--track)]" aria-hidden="true">
                  <span className="h-full bg-[var(--blue)]" style={{ width: width(row.b) }} />
                </span>
                <span className="w-24 shrink-0 font-display text-[30px] font-extrabold leading-none tabular-nums">{row.textB}</span>
              </dd>
            </div>
          )
        })}
      </dl>
      <p className="mt-3 text-sm text-[var(--muted)]">
        {L(lang, 'A barra do cartel compara a taxa de vitórias. Um traço indica que o dado não está disponível.', 'The record bar compares win rates. A dash means the figure is not available.', 'La barre du palmarès compare les taux de victoire. Un tiret signale une donnée absente.', 'La barra del récord compara el porcentaje de victorias. Un guion indica que el dato no está disponible.')}
      </p>
    </section>
  )
}

/** The opponents both fighters have faced, and how each did. */
function CommonOpponents({ fighterA, fighterB, history }: { fighterA: string; fighterB: string; history: HeadToHeadResponse | null }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const surname = (name: string) => name.trim().split(/\s+/).pop() ?? name
  const shared = history && history.fighter_a.toLowerCase() === fighterA.toLowerCase() && history.fighter_b.toLowerCase() === fighterB.toLowerCase() ? history.common_opponents : null
  const outcome = (result: 'win' | 'loss' | null) =>
    result === 'win' ? L(lang, 'Vitória', 'Win', 'Victoire', 'Victoria') : result === 'loss' ? L(lang, 'Derrota', 'Loss', 'Défaite', 'Derrota') : L(lang, 'Sem resultado', 'No result', 'Sans résultat', 'Sin resultado')

  return (
    <div>
      <h2 className="text-[32px] leading-[1.05] sm:text-4xl">{L(lang, 'Adversários em comum', 'Common opponents', 'Adversaires communs', 'Rivales en común')}</h2>
      {shared === null ? (
        <p className="mt-2 text-base text-[var(--muted)]" role="status">{L(lang, 'Carregando o histórico dos dois…', 'Loading both fighters’ history…', 'Chargement de l’historique des deux…', 'Cargando el historial de los dos…')}</p>
      ) : shared.length === 0 ? (
        <p className="mt-2 text-base text-[var(--muted)]">{L(lang, 'Os dois ainda não enfrentaram o mesmo adversário.', 'The two have not faced the same opponent yet.', 'Les deux n’ont pas encore affronté le même adversaire.', 'Los dos aún no se han enfrentado al mismo rival.')}</p>
      ) : (
        <table className="mt-3 w-full border-t-[3px] border-[var(--ink)] text-left">
          <thead>
            <tr className="border-b border-[var(--rule)] text-[15px]">
              <th className="py-3 pr-3 font-bold">{L(lang, 'Adversário', 'Opponent', 'Adversaire', 'Rival')}</th>
              <th className="py-3 pr-3 font-bold text-[var(--red-text)]">{surname(fighterA)}</th>
              <th className="py-3 font-bold text-[var(--blue-text)]">{surname(fighterB)}</th>
            </tr>
          </thead>
          <tbody>
            {shared.map((row) => (
              <tr key={row.opponent} className="border-b border-[var(--rule)] text-base">
                <td className="py-3.5 pr-3">{row.opponent}</td>
                <td className="py-3.5 pr-3">{outcome(row.fighter_a_result)}</td>
                <td className="py-3.5">{outcome(row.fighter_b_result)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------------------------ */

/** A name field with the matching fighters under it. */
function NameField({ value, exclude, onChoose }: { value: string; exclude: string; onChoose: (name: string) => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { fighters } = useFighters()
  const id = useId()
  const [query, setQuery] = useState(value)
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (term.length < 2 || term === value.toLowerCase()) return []
    return fighters.filter((f) => f.name.toLowerCase().includes(term) && f.name !== exclude).slice(0, 8)
  }, [fighters, query, value, exclude])

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-2 block text-[15px] text-[var(--muted)]">
        {L(lang, 'Nome do lutador', 'Fighter’s name', 'Nom du combattant', 'Nombre del peleador')}
      </label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={L(lang, 'Digite um nome', 'Type a name', 'Tapez un nom', 'Escribe un nombre')}
        aria-controls={`${id}-list`}
        className="soft-input min-h-14 w-full px-4 text-lg font-medium"
      />
      {matches.length ? (
        <ul id={`${id}-list`} className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border-[1.5px] border-[var(--ink)] bg-[var(--panel)]">
          {matches.map((f) => (
            <li key={f.name}>
              <button
                type="button"
                onClick={() => {
                  setQuery(f.name)
                  onChoose(f.name)
                }}
                className="flex min-h-12 w-full cursor-pointer flex-col items-start justify-center px-4 py-2 text-left hover:bg-[var(--panel-hover)]"
              >
                <span className="text-base font-bold">{f.name}</span>
                <span className="text-sm text-[var(--muted)]">
                  {[getDivisionName(f.division, lang), f.wins != null ? `${f.wins}-${f.losses ?? 0}-${f.draws ?? 0}` : null].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** Before both corners are filled: a name field for each, and the fights already booked as a shortcut. */
function EmptyMatchup({
  fighterA,
  fighterB,
  onChoose,
  scheduled,
}: {
  fighterA: string
  fighterB: string
  onChoose: (side: Side, name: string) => void
  scheduled: UpcomingPick[]
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const sameFighter = Boolean(fighterA && fighterB && fighterA.toLowerCase() === fighterB.toLowerCase())
  const day = (date: string | null) => {
    const parsed = date ? new Date(`${date}T00:00:00Z`) : null
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleDateString(localeTag(lang), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : null
  }
  const panel = (side: Side, value: string, exclude: string) => (
    <div className={`min-w-0 flex-[1_1_420px] border-t-8 bg-[var(--panel)] px-5 pb-8 pt-6 sm:px-8 ${side === 'a' ? 'border-[var(--red)]' : 'border-[var(--blue)]'}`}>
      <p className="mb-3 text-base font-bold">{side === 'a' ? L(lang, 'Canto vermelho', 'Red corner', 'Coin rouge', 'Esquina roja') : L(lang, 'Canto azul', 'Blue corner', 'Coin bleu', 'Esquina azul')}</p>
      <NameField value={value} exclude={exclude} onChoose={(name) => onChoose(side, name)} />
      <p className="mt-3 text-[15px] text-[var(--muted)]">
        {L(lang, 'Ou ', 'Or ', 'Ou ', 'O ')}
        <Link to="/fighters" className="font-bold text-[var(--ink)] underline underline-offset-4">
          {L(lang, 'veja a lista de lutadores', 'browse the fighter list', 'parcourez la liste des combattants', 'mira la lista de peleadores')}
        </Link>
        .
      </p>
    </div>
  )

  return (
    <div>
      <div className="flex flex-wrap items-stretch">
        {panel('a', fighterA, fighterB)}
        <div className="flex flex-[0_0_96px] items-center justify-center font-display text-[44px] font-black text-[var(--muted)] max-md:basis-full max-md:py-2">vs</div>
        {panel('b', fighterB, fighterA)}
      </div>
      <p className="mt-4 text-[15px] text-[var(--muted)]" role="status">
        {sameFighter
          ? L(lang, 'Escolha dois lutadores diferentes.', 'Choose two different fighters.', 'Choisissez deux combattants différents.', 'Elige dos peleadores distintos.')
          : L(lang, 'Escolha os dois lutadores para ver a chance de vitória estimada pelo modelo.', 'Choose both fighters to see the model’s estimated win chance.', 'Choisissez les deux combattants pour voir la chance de victoire estimée par le modèle.', 'Elige a los dos peleadores para ver la probabilidad de victoria estimada por el modelo.')}
      </p>

      {scheduled.length ? (
        <section className="pt-14">
          <h2 className="text-[32px] leading-[1.05] sm:text-4xl">{L(lang, 'Ou comece por uma luta marcada', 'Or start from a booked fight', 'Ou partez d’un combat programmé', 'O empieza por una pelea programada')}</h2>
          <ul className="mt-4 border-t-[3px] border-[var(--ink)]">
            {scheduled.slice(0, 5).map((pick) => (
              <li key={`${pick.event_name}-${pick.fighter_1}`} className="border-b border-[var(--rule)]">
                <button
                  type="button"
                  onClick={() => {
                    onChoose('a', pick.fighter_1)
                    onChoose('b', pick.fighter_2)
                  }}
                  className="row-link flex w-full cursor-pointer flex-wrap items-center gap-x-8 gap-y-2 px-3 py-5 text-left hover:bg-[var(--panel)]"
                >
                  <span className="flex-[1.4_1_320px] font-display text-[34px] font-black leading-none sm:text-[44px]">
                    {pick.fighter_1.split(' ').pop()} vs {pick.fighter_2.split(' ').pop()}
                  </span>
                  <span className="flex-[1.6_1_280px] text-base text-[var(--muted)]">
                    {[pick.event_name, day(pick.event_date), pick.title_fight ? L(lang, 'luta pelo cinturão', 'title fight', 'combat de titre', 'pelea por el título') : null].filter(Boolean).join(', ')}
                  </span>
                  <span className="text-base font-bold">{L(lang, 'Comparar', 'Compare', 'Comparer', 'Comparar')}</span>
                  <svg className="row-arrow h-7 w-7 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <path d="M4 12h16M14 6l6 6-6 6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

/** A dialog to change the fighter in one corner. */
function FighterPicker({ title, exclude, onClose, onPick }: { title: string; exclude: string; onClose: () => void; onPick: (name: string) => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const { fighters } = useFighters()
  const [query, setQuery] = useState('')
  const id = useId()
  const list = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (term ? fighters.filter((f) => f.name.toLowerCase().includes(term) || f.nickname?.toLowerCase().includes(term)) : fighters).filter((f) => f.name !== exclude).slice(0, 15)
  }, [fighters, query, exclude])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--modal-backdrop)] p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} className="w-full max-w-lg border-[1.5px] border-[var(--ink)] bg-[var(--mat)] p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 border-b-[3px] border-[var(--ink)] pb-3">
          <h2 id={`${id}-title`} className="text-[28px] leading-none">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={L(lang, 'Fechar', 'Close', 'Fermer', 'Cerrar')} className="grid h-11 w-11 cursor-pointer place-items-center hover:bg-[var(--panel-hover)]">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <label htmlFor={id} className="mb-2 mt-4 block text-[15px] text-[var(--muted)]">
          {L(lang, 'Nome do lutador', 'Fighter’s name', 'Nom du combattant', 'Nombre del peleador')}
        </label>
        <div className="soft-input flex min-h-14 items-center gap-3 px-4">
          <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <input
            id={id}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={L(lang, 'Digite um nome', 'Type a name', 'Tapez un nom', 'Escribe un nombre')}
            className="w-full bg-transparent text-lg outline-none"
            autoFocus
          />
        </div>
        <ul className="mt-4 max-h-72 divide-y divide-[var(--rule)] overflow-y-auto">
          {list.map((f) => (
            <li key={f.name}>
              <button type="button" onClick={() => onPick(f.name)} className="flex min-h-12 w-full cursor-pointer flex-col items-start justify-center px-2 py-2 text-left hover:bg-[var(--panel-hover)]">
                <span className="text-base font-bold">{f.name}</span>
                <span className="text-sm text-[var(--muted)]">
                  {[getDivisionName(f.division, lang), f.wins != null ? `${f.wins}-${f.losses ?? 0}-${f.draws ?? 0}` : null].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
