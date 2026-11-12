import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Dumbbell, Info, LoaderCircle, MapPin, Swords } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, localeTag } from '../../i18n/lang'
import { orgEs, orgFr, orgPt, type OrgConfig } from '../../shared/data/orgs'
import { translateHometown } from '../../shared/data/fightLabels'
import { getDivisionName } from '../../shared/data/divisions'
import { ChampionBelt } from '../../shared/components/ChampionBelt'
import { FighterAvatar } from '../../shared/components/FighterAvatar'
import { OrgFighterModal } from '../../shared/components/OrgFighterModal'
import { useOrg } from '../../shared/hooks/useOrg'
import { useOrgFighters } from '../../shared/hooks/useOrgData'
import { formatProbability, localizePredictionMessage } from '../../shared/data/probability'
import { DataConfidenceNote } from '../../shared/components/DataConfidenceNote'
import { localizeFeature } from '../../shared/utils/localizeFeature'
import { usePrediction } from '../../shared/hooks/usePrediction'
import { Eyebrow } from '../../shared/components/ui/Eyebrow'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import type { FighterProfile, MainFactor, OrgFighter, PredictionResponse } from '../../shared/types/api'

export function OrgPredictor() {
  const { i18n } = useTranslation()
  const org = useOrg()
  const [searchParams, setSearchParams] = useSearchParams()
  const presetA = searchParams.get('a') || searchParams.get('fighter_a') || ''
  const presetB = searchParams.get('b') || searchParams.get('fighter_b') || ''
  const [nameA, setNameA] = useState(() => presetA)
  const [nameB, setNameB] = useState(() => presetB)
  const [profileName, setProfileName] = useState<string | null>(null)
  const { fighters, loading: fightersLoading, error: fightersError } = useOrgFighters(org.id)
  const { prediction, loading: predicting, error: predictionError, runPrediction } = usePrediction()
  const [error, setError] = useState<string | null>(null)

  const chooseCorner = (side: 'a' | 'b', value: string) => {
    if (side === 'a') setNameA(value)
    else setNameB(value)
    const next = new URLSearchParams(searchParams)
    if (value) next.set(side, value)
    else next.delete(side)
    setSearchParams(next, { replace: true })
  }

  const swapCorners = () => {
    if (!nameA && !nameB) return
    const nextA = nameB
    const nextB = nameA
    setNameA(nextA)
    setNameB(nextB)
    const next = new URLSearchParams(searchParams)
    if (nextA) next.set('a', nextA)
    else next.delete('a')
    if (nextB) next.set('b', nextB)
    else next.delete('b')
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    if (!presetA || !presetB || presetA === presetB) return
    void runPrediction(presetA, presetB)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fighterA = useMemo(() => fighters.find((f) => f.name === nameA) ?? null, [fighters, nameA])
  const fighterB = useMemo(() => fighters.find((f) => f.name === nameB) ?? null, [fighters, nameB])
  const canScore = Boolean(nameA && nameB && nameA !== nameB)

  const score = async () => {
    if (!canScore) return
    try {
      setError(null)
      await runPrediction(nameA, nameB)
    } catch {
      setError(
        L(
          i18n.language,
          'Falha na previsão. Tente novamente em instantes.',
          'Prediction failed. Please try again.',
          'Échec de prédiction. Veuillez réessayer.',
          'Falló el pronóstico. Inténtalo de nuevo.',
        ),
      )
    }
  }

  const activeFighters = useMemo(() => fighters.filter((f) => f.is_active).length, [fighters])
  const problem = error ?? predictionError ?? fightersError

  // Suggested marquee bouts for the organization
  const quickBouts = useMemo(() => {
    if (org.id === 'one') {
      return [
        ['Rodtang Jitmuangnon', 'Superlek Kiatmoo9'],
        ['Christian Lee', 'Saygid Izagakhmaev'],
        ['Demetrious Johnson', 'Adriano Moraes'],
        ['Anatoly Malykhin', 'Oumar Kane'],
      ]
    }
    return []
  }, [org.id])

  const lang = i18n.language

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={L(lang, 'Quem vence?', 'Who takes it?', 'Qui gagne ?', '¿Quién gana?')}
        description={L(
          lang,
          `Selecione dois atletas ${orgPt(org, 'de')}. O modelo estima a chance de vitória de cada um e mostra os números que mais pesam.`,
          `Pick any two ${org.shortName} fighters. The model estimates each one’s win chance and shows the numbers that weigh most.`,
          `Sélectionnez deux combattants ${orgFr(org, 'de')}. Le modèle estime la chance de victoire de chacun et montre les chiffres qui pèsent le plus.`,
          `Elige a dos peleadores de ${orgEs(org)}. El modelo estima la probabilidad de victoria de cada uno y muestra los números que más pesan.`,
        )}
        stats={[
          { label: L(lang, 'Lutadores', 'Fighters', 'Combattants', 'Peleadores'), value: fighters.length.toLocaleString(localeTag(lang)) },
          { label: L(lang, 'Em atividade', 'Active', 'En activité', 'En actividad'), value: activeFighters.toLocaleString(localeTag(lang)) },
        ]}
      >
        {quickBouts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow as="span">{L(lang, 'Lutas em destaque', 'Featured matchups', 'Combats à l’affiche', 'Peleas destacadas')}</Eyebrow>
            {quickBouts.map(([a, b]) => (
              <button
                key={`${a}-${b}`}
                type="button"
                onClick={() => {
                  chooseCorner('a', a)
                  chooseCorner('b', b)
                  void runPrediction(a, b)
                }}
                className="inline-flex min-h-9 cursor-pointer items-center rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]"
              >
                {a} vs {b}
              </button>
            ))}
          </div>
        ) : null}
      </PageHeader>

      {problem ? (
        <p role="alert" className="error-note">{problem}</p>
      ) : null}

      <OutsideUfcNotice org={org} />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <CornerCard
          side="red"
          fighter={fighterA}
          fighters={fighters}
          disabledName={nameB}
          loading={fightersLoading}
          selectedName={nameA}
          onSelect={(name) => chooseCorner('a', name)}
          onOpenProfile={(name) => setProfileName(name)}
        />
        <CornerCard
          side="blue"
          fighter={fighterB}
          fighters={fighters}
          disabledName={nameA}
          loading={fightersLoading}
          selectedName={nameB}
          onSelect={(name) => chooseCorner('b', name)}
          onOpenProfile={(name) => setProfileName(name)}
        />
      </div>

      <div className="flex flex-wrap items-stretch gap-3">
        <button
          type="button"
          onClick={swapCorners}
          disabled={!nameA && !nameB}
          className="ghost-action inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-sm px-5 text-xs disabled:cursor-not-allowed disabled:opacity-40 max-sm:w-full"
        >
          <ArrowLeftRight className="h-4 w-4" />
          {L(lang, 'Inverter cantos', 'Swap corners', 'Inverser les coins', 'Intercambiar esquinas')}
        </button>
        <button
          type="button"
          onClick={score}
          disabled={!canScore || predicting}
          className="primary-action inline-flex min-h-14 flex-1 cursor-pointer items-center justify-center gap-3 rounded-sm px-6 text-base"
        >
          {predicting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Swords className="h-5 w-5" />}
          {L(lang, 'Simular combate', 'Predict a fight', 'Prédire un combat', 'Pronosticar una pelea')}
        </button>
      </div>

      {prediction ? (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <OrgScorecard prediction={prediction} />
            {prediction.main_factors?.length ? <OrgDrivers factors={prediction.main_factors} redName={prediction.fighter_a_profile.name} /> : null}
          </div>
          <OrgTaleOfTheTape fighterA={prediction.fighter_a_profile} fighterB={prediction.fighter_b_profile} />
        </div>
      ) : null}

      {profileName ? (
        <OrgFighterModal
          key={profileName}
          org={org}
          name={profileName}
          onClose={() => setProfileName(null)}
          onSelectFighter={setProfileName}
        />
      ) : null}
    </div>
  )
}

/** Says, before anyone reads a percentage, that the model comes from UFC fights and what this organization's data lacks. */
function OutsideUfcNotice({ org }: { org: OrgConfig }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return (
    <aside
      aria-label={L(lang, 'Aviso sobre as previsões', 'About these predictions', 'À propos de ces prévisions', 'Sobre estos pronósticos')}
      className="flex items-start gap-2.5 rounded-sm border border-[var(--border-subtle)] border-l-4 border-l-[var(--accent-gold)] bg-[var(--bg-surface)] px-4 py-3"
    >
      <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-gold)]" />
      <p className="text-sm leading-6 text-[var(--text-secondary)]">
        {L(
          lang,
          `O modelo foi treinado com lutas do UFC e só foi validado nelas. Os dados ${orgPt(org, 'de')} trazem cartel, idade e medidas, mas não a precisão de golpes nem de quedas: nesses pontos o modelo usa médias.`,
          `The model is trained on UFC fights and has only been validated on them. The ${org.shortName} data has record, age and measurements, but no striking or takedown accuracy, so the model uses averages for those.`,
          `Le modèle est entraîné sur des combats UFC et n’a été validé que sur eux. Les données ${org.shortName} donnent le bilan, l’âge et les mensurations, mais pas la précision en frappe ni aux takedowns : le modèle utilise des moyennes.`,
          `El modelo se entrena con peleas de la UFC y solo se validó con ellas. Los datos de ${orgEs(org)} traen récord, edad y medidas, pero no la precisión de golpes ni de derribos: en esos puntos el modelo usa promedios.`,
        )}
        {org.probabilitiesEased
          ? ` ${L(
              lang,
              'Por cautela, as chances mostradas ficam na metade do caminho entre o resultado do modelo e 50%.',
              "To be safe, the chances shown sit halfway between the model's output and 50%.",
              'Par prudence, les chances affichées se situent à mi-chemin entre le résultat du modèle et 50 %.',
              'Por precaución, las probabilidades mostradas quedan a medio camino entre el resultado del modelo y 50 %.',
            )}`
          : null}
      </p>
    </aside>
  )
}

const PANEL = 'overflow-hidden rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)]'
const PANEL_HEAD = 'flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-4 py-3'
const PANEL_NOTE = 'text-label font-bold text-[var(--text-muted)]'

function CornerCard({
  side,
  fighter,
  fighters,
  disabledName,
  loading,
  selectedName,
  onSelect,
  onOpenProfile,
}: {
  side: 'red' | 'blue'
  fighter: OrgFighter | null
  fighters: OrgFighter[]
  disabledName?: string
  loading: boolean
  selectedName: string
  onSelect: (name: string) => void
  onOpenProfile: (name: string) => void
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const block = side === 'red' ? 'bg-[var(--red)]' : 'bg-[var(--blue)]'
  const selectId = `corner-${side}`

  const sortedFighters = useMemo(() => {
    return [...fighters].sort((a, b) => a.name.localeCompare(b.name))
  }, [fighters])

  const place = fighter?.country
    ? `${fighter.hometown ? `${translateHometown(fighter.hometown, lang)}, ` : ''}${translateHometown(fighter.country, lang)}`
    : null
  const facts: [string, string][] = fighter
    ? [
        [L(lang, 'Idade', 'Age', 'Âge', 'Edad'), fighter.age ? `${Math.round(fighter.age)}` : '—'],
        [L(lang, 'Altura', 'Height', 'Taille', 'Estatura'), fighter.height_cm ? `${Math.round(fighter.height_cm)} cm` : '—'],
        [L(lang, 'Envergadura', 'Reach', 'Allonge', 'Alcance'), fighter.reach_cm ? `${Math.round(fighter.reach_cm)} cm` : '—'],
        [L(lang, 'Prec. golpes', 'Str. Acc', 'Préc. coups', 'Prec. golpes'), fighter.sig_str_acc ? `${Math.round(fighter.sig_str_acc * 100)}%` : '—'],
        [L(lang, 'Quedas / 15 min', 'TD / 15 min', 'Amenées / 15 min', 'Derribos / 15 min'), fighter.takedown_avg_per_15min != null ? fighter.takedown_avg_per_15min.toFixed(2) : '—'],
        [L(lang, 'Taxa de finalização', 'Finish rate', 'Avant la limite', 'Tasa de finalización'), fighter.finish_rate != null ? `${Math.round(fighter.finish_rate * 100)}%` : '—'],
      ]
    : []

  return (
    <section className={`flex min-w-0 flex-col ${PANEL}`}>
      <div className={`${block} flex items-center justify-between gap-3 px-4 py-2.5 text-white`}>
        <span className="poster-display text-lg sm:text-xl">
          {side === 'red' ? L(lang, 'Canto vermelho', 'Red corner', 'Coin rouge', 'Esquina roja') : L(lang, 'Canto azul', 'Blue corner', 'Coin bleu', 'Esquina azul')}
        </span>
        {fighter?.division ? <span className="truncate text-xs font-bold">{getDivisionName(fighter.division, lang)}</span> : null}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div>
          <label htmlFor={selectId} className="mb-1.5 block text-label font-semibold text-[var(--text-muted)]">
            {L(lang, 'Lutador', 'Fighter', 'Combattant', 'Peleador')}
          </label>
          <select
            id={selectId}
            value={selectedName}
            onChange={(e) => onSelect(e.target.value)}
            disabled={loading}
            className={`${side === 'blue' ? 'soft-input-blue ' : ''}soft-input w-full rounded-sm px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] outline-none`}
          >
            <option value="">
              {loading ? L(lang, 'Carregando...', 'Loading...', 'Chargement...', 'Cargando...') : L(lang, 'Escolha um lutador...', 'Choose a fighter...', 'Choisissez un combattant...', 'Elige un peleador...')}
            </option>
            {sortedFighters.map((f) => (
              <option key={f.name} value={f.name} disabled={f.name === disabledName}>
                {f.name} {f.division ? `(${getDivisionName(f.division, lang)})` : ''} {f.belt ? `· ${L(lang, 'campeão', 'champion', 'champion', 'campeón')}` : ''}
              </option>
            ))}
          </select>
        </div>

        {fighter ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => onOpenProfile(fighter.name)}
                className="shrink-0 cursor-pointer transition hover:scale-105"
                title={L(lang, `Abrir perfil completo de ${fighter.name}`, `Open ${fighter.name}'s full profile`, `Ouvrir le profil complet de ${fighter.name}`, `Abrir el perfil completo de ${fighter.name}`)}
              >
                <FighterAvatar name={fighter.name} imageUrl={fighter.image_url} className="h-24 w-24 sm:h-28 sm:w-28" />
              </button>
              <div className="min-w-0">
                <h3 className="poster-display flex flex-wrap items-center gap-2 text-2xl leading-none text-[var(--text-primary)] sm:text-3xl">
                  <button type="button" onClick={() => onOpenProfile(fighter.name)} className="cursor-pointer text-left transition hover:text-[var(--text-red)]">
                    {fighter.name}
                  </button>
                  <span className="text-xs font-bold text-[var(--text-muted)]">
                    ({fighter.wins ?? 0}-{fighter.losses ?? 0}{fighter.draws ? `-${fighter.draws}` : ''})
                  </span>
                  {fighter.belt ? <ChampionBelt /> : null}
                </h3>
                {fighter.nickname ? <p className="mt-1 truncate text-xs font-semibold text-[var(--text-red)]">“{fighter.nickname}”</p> : null}
                {place ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate">{place}</span>
                  </p>
                ) : null}
                {fighter.camp ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <Dumbbell className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate">{fighter.camp}</span>
                  </p>
                ) : null}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--border-subtle)] pt-3 sm:grid-cols-3">
              {facts.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="truncate text-label text-[var(--text-muted)]">{label}</dt>
                  <dd className="poster-display mt-1 truncate text-lg text-[var(--text-primary)]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center rounded-sm border border-dashed border-[var(--border-default)] px-4 py-10 text-center">
            <p className="poster-display text-3xl text-[var(--text-muted)] sm:text-4xl">{loading ? '...' : L(lang, 'A definir', 'TBA', 'À définir', 'Por definir')}</p>
            <p className="mt-1 text-xs font-bold text-[var(--text-muted)]">{L(lang, 'Aguardando lutador', 'To be announced', 'En attente d’un combattant', 'Peleador por anunciar')}</p>
          </div>
        )}
      </div>
    </section>
  )
}

function OrgScorecard({ prediction }: { prediction: PredictionResponse }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const rows = [
    { name: prediction.fighter_a_profile.name, value: prediction.fighter_a_probability, color: 'bg-[var(--red-deep)]' },
    { name: prediction.fighter_b_profile.name, value: prediction.fighter_b_probability, color: 'bg-[var(--blue-deep)]' },
  ]

  return (
    <section className={PANEL}>
      <div className={PANEL_HEAD}>
        <span className="poster-display text-lg text-[var(--text-primary)]">{L(lang, 'Placar de probabilidades', 'Official scorecard', 'Carte des probabilités', 'Tarjeta oficial')}</span>
        <span className={PANEL_NOTE}>{L(lang, 'Chance estimada pelo modelo', 'Model’s estimated chance', 'Chance estimée par le modèle', 'Probabilidad estimada por el modelo')}</span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div className="min-w-0">
            <p className="text-label font-bold text-[var(--text-red)]">{L(lang, 'Favorito previsto', 'Projected winner', 'Vainqueur prévu', 'Ganador proyectado')}</p>
            <p className="poster-display mt-1 break-words text-2xl leading-none text-[var(--text-primary)] sm:text-3xl">{prediction.predicted_winner}</p>
          </div>
          <p className="poster-display text-4xl leading-none text-[var(--text-red)] sm:text-5xl">{formatProbability(prediction.probability)}</p>
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.name}>
              <div className="flex items-end justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-bold text-[var(--text-primary)]">{row.name}</span>
                <span className="poster-display text-xl text-[var(--text-primary)]">{formatProbability(row.value)}</span>
              </div>
              <div className="mt-1 h-3.5 overflow-hidden rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]">
                <div className={`h-full ${row.color}`} style={{ width: `${row.value * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm font-medium leading-6 text-[var(--text-secondary)]">{localizePredictionMessage(prediction.message, prediction.predicted_winner, lang)}</p>

        {prediction.data_confidence ? <DataConfidenceNote confidence={prediction.data_confidence} /> : null}
      </div>
    </section>
  )
}

type TapeFighter = FighterProfile | OrgFighter | null | undefined

function OrgTaleOfTheTape({ fighterA, fighterB }: { fighterA: TapeFighter; fighterB: TapeFighter }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const cm = (value: number | null | undefined) => (value ? `${Math.round(value)} cm` : '—')
  const pct = (value: number | null | undefined) => (value ? `${Math.round(value * 100)}%` : '—')
  const rows = [
    { label: L(lang, 'Idade', 'Age', 'Âge', 'Edad'), a: fighterA?.age ? `${Math.round(fighterA.age)}` : '—', b: fighterB?.age ? `${Math.round(fighterB.age)}` : '—' },
    { label: L(lang, 'Altura', 'Height', 'Taille', 'Estatura'), a: cm(fighterA?.height_cm), b: cm(fighterB?.height_cm) },
    { label: L(lang, 'Envergadura', 'Reach', 'Allonge', 'Alcance'), a: cm(fighterA?.reach_cm), b: cm(fighterB?.reach_cm) },
    { label: L(lang, 'Cartel', 'Record', 'Palmarès', 'Récord'), a: `${fighterA?.wins ?? 0}-${fighterA?.losses ?? 0}`, b: `${fighterB?.wins ?? 0}-${fighterB?.losses ?? 0}` },
    { label: L(lang, 'Precisão de golpes', 'Striking accuracy', 'Précision des coups', 'Precisión de golpes'), a: pct(fighterA?.sig_str_acc), b: pct(fighterB?.sig_str_acc) },
    { label: L(lang, 'Precisão de quedas', 'Takedown accuracy', 'Précision des amenées', 'Precisión de derribos'), a: pct(fighterA?.takedown_acc), b: pct(fighterB?.takedown_acc) },
    { label: L(lang, 'Taxa de vitória', 'Win rate', 'Taux de victoire', 'Porcentaje de victorias'), a: pct(fighterA?.win_rate), b: pct(fighterB?.win_rate) },
  ]

  return (
    <section className={PANEL}>
      <div className={PANEL_HEAD}>
        <span className="poster-display text-lg text-[var(--text-primary)]">{L(lang, 'Raio-x dos lutadores', 'Tale of the tape', 'La fiche comparative', 'Comparativa de peleadores')}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] border-b border-[var(--border-subtle)] text-center">
        <span className="poster-display truncate bg-[var(--red)] px-3 py-2 text-base text-white sm:text-lg">{fighterA?.name ?? L(lang, 'Canto vermelho', 'Red corner', 'Coin rouge', 'Esquina roja')}</span>
        <span className="w-24 shrink-0 sm:w-40" />
        <span className="poster-display truncate bg-[var(--blue)] px-3 py-2 text-base text-white sm:text-lg">{fighterB?.name ?? L(lang, 'Canto azul', 'Blue corner', 'Coin bleu', 'Esquina azul')}</span>
      </div>

      <div>
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-[var(--border-subtle)] py-2.5 text-center last:border-b-0">
            <span className="poster-display px-2 text-xl text-[var(--text-primary)] sm:text-2xl">{row.a}</span>
            <span className="w-24 shrink-0 px-1 text-label font-semibold leading-tight text-[var(--text-secondary)] sm:w-40">{row.label}</span>
            <span className="poster-display px-2 text-xl text-[var(--text-primary)] sm:text-2xl">{row.b}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/** The factors behind the estimate; each bar takes the colour of the corner it favours. */
function OrgDrivers({ factors, redName }: { factors: MainFactor[]; redName: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const rows = factors.slice(0, 6)

  return (
    <section className={PANEL}>
      <div className={PANEL_HEAD}>
        <span className="poster-display text-lg text-[var(--text-primary)]">{L(lang, 'Fatores determinantes', 'Why the model leans', 'Pourquoi le modèle penche', 'Por qué se inclina el modelo')}</span>
        
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {rows.map((factor, index) => (
          <div key={factor.feature}>
            <div className="flex items-end justify-between gap-3">
              <span className="flex min-w-0 items-end gap-2">
                <span className="poster-display w-5 shrink-0 text-lg text-[var(--text-red)]">{index + 1}</span>
                <span className="min-w-0 truncate text-xs font-bold text-[var(--text-primary)] sm:text-sm">{localizeFeature(factor.feature, lang)}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-[var(--text-secondary)]">
                {L(lang, `A favor de ${factor.impact}`, `Favors ${factor.impact}`, `En faveur de ${factor.impact}`, `A favor de ${factor.impact}`)}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]">
              <div className={`h-full ${factor.impact === redName ? 'bg-[var(--red)]' : 'bg-[var(--blue)]'}`} style={{ width: `${Math.min(100, Math.max(15, factor.magnitude * 250))}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
