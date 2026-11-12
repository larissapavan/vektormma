import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeftRight, ArrowRight, LoaderCircle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { L, localeTag } from '../i18n/lang'
import { getDivisionName } from '../shared/data/divisions'
import { translateHometown } from '../shared/data/fightLabels'
import { ChampionBelt } from '../shared/components/ChampionBelt'
import { FighterAvatar } from '../shared/components/FighterAvatar'
import { FighterProfileModal } from '../shared/components/FighterProfileModal'
import { FighterSelect } from '../shared/components/FighterSelect'
import { FighterBadges, FlagList, TitleFightBadge } from '../shared/components/FighterBadges'
import { getFighterImageUrl, useFighterImages } from '../shared/hooks/useFighterImages'
import { useFighters } from '../shared/hooks/useFighters'
import { localizePredictionMessage } from '../shared/data/probability'
import { DataConfidenceNote } from '../shared/components/DataConfidenceNote'
import { localizeFeature } from '../shared/utils/localizeFeature'
import { shownMetrics } from '../shared/data/modelAccuracy'
import { useModelInfo } from '../shared/hooks/useModelInfo'
import { usePrediction } from '../shared/hooks/usePrediction'
import { PageHeader } from '../shared/components/ui/PageHeader'
import { predictionSentence, ProbabilityBand } from '../shared/components/ui/ProbabilityBand'
import { getMatchupTitleFight } from '../shared/data/titleFights'
import type { FighterProfile, MainFactor, PredictionResponse } from '../shared/types/api'

export function Predictor() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const presetA = searchParams.get('a') || searchParams.get('fighter_a') || ''
  const presetB = searchParams.get('b') || searchParams.get('fighter_b') || ''
  const [nameA, setNameA] = useState(() => presetA)
  const [nameB, setNameB] = useState(() => presetB)
  const [profileName, setProfileName] = useState<string | null>(null)
  const { fighters, loading, error: fightersError } = useFighters()
  const { modelInfo, health } = useModelInfo()
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
    // Only auto-score when the page mounts with URL params
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fighterA = useMemo(() => fighters.find((fighter) => fighter.name === nameA) ?? null, [fighters, nameA])
  const fighterB = useMemo(() => fighters.find((fighter) => fighter.name === nameB) ?? null, [fighters, nameB])
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
          'Falha na previsão. Verifique a conexão com o servidor e tente novamente.',
          'Prediction failed. Check whether the backend is available and try again.',
          'Échec du calcul. Vérifiez que le serveur est accessible et réessayez.',
          'Falló el pronóstico. Verifica que el servidor esté disponible e inténtalo de nuevo.',
        ),
      )
    }
  }

  const activeFighters = useMemo(() => fighters.filter((fighter) => fighter.is_active).length, [fighters])
  const shown = shownMetrics(modelInfo, i18n.language)
  const isOnline = Boolean(health?.model_loaded)
  const problem = error ?? predictionError ?? fightersError

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow={t('predictor.question', "Tonight's question")}
        title={t('predictor.whoTakesIt', 'Who takes it?')}
        description={t('predictor.heroSubtitle', 'Pick any two fighters. The model gives you the odds and shows which numbers moved them.')}
      />

      <Scoreboard
        cells={[
          {
            label: t('predictor.fightsOnFile', 'Fights on file'),
            value: health?.fights_tracked ? health.fights_tracked.toLocaleString(localeTag(i18n.language)) : '—',
            note: resultsThrough(health?.latest_fight_date ?? null, i18n.language),
          },
          {
            label: t('predictor.fighters', 'Fighters'),
            value: (health?.fighters_loaded ?? fighters.length).toLocaleString(localeTag(i18n.language)),
            note: activeFighters ? `${activeFighters.toLocaleString(localeTag(i18n.language))} ${t('predictor.active', 'active')}` : undefined,
          },
          {
            label: t('predictor.modelAccuracy', 'Model accuracy'),
            value: shown.accuracy != null ? `${(shown.accuracy * 100).toFixed(1)}%` : '—',
            note: shown.caption || undefined,
          },
          {
            label: t('predictor.backend', 'Backend'),
            value: isOnline ? t('predictor.onAir', 'On air') : t('header.apiOffline', 'Offline'),
            note: isOnline ? L(i18n.language, 'Modelo carregado', 'Model loaded', 'Modèle chargé', 'Modelo cargado') : L(i18n.language, 'Inacessível', 'Unreachable', 'Injoignable', 'Inaccesible'),
            alert: !isOnline,
            onlineDot: isOnline,
          },
        ]}
      />

      {problem ? (
        <p className="rounded-sm border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/15 px-3 py-2 text-sm font-semibold text-[var(--text-gold)]">{problem}</p>
      ) : null}

      <div className="space-y-6">
        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)]">
          <Corner side="red" fighter={fighterA} loading={loading} onOpenProfile={setProfileName}>
            <FighterSelect
              label={t('predictor.redCorner', 'Red corner')}
              corner="red"
              value={nameA}
              fighters={fighters}
              disabledFighterName={nameB}
              placeholder={t('predictor.searchPlaceholder', 'Search fighter by name...')}
              onChange={(val) => chooseCorner('a', val)}
            />
          </Corner>

          <div className="flex flex-col items-center justify-center gap-2 py-1 lg:py-0">
            <button
              type="button"
              onClick={swapCorners}
              disabled={!nameA && !nameB}
              title={L(i18n.language, 'Inverter cantos (vermelho ⇄ azul)', 'Swap corners (red ⇄ blue)', 'Inverser les coins (rouge ⇄ bleu)', 'Intercambiar esquinas (roja ⇄ azul)')}
              aria-label={L(i18n.language, 'Inverter cantos', 'Swap corners', 'Inverser les coins', 'Intercambiar esquinas')}
              className={`poster-display group relative grid h-14 w-14 -rotate-6 place-items-center rounded-sm border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] text-2xl transition ${
                nameA || nameB ? 'cursor-pointer hover:rotate-0 hover:scale-105 active:scale-95 text-[var(--text-primary)]' : 'cursor-default text-[var(--text-muted)]'
              }`}
            >
              <span className={nameA || nameB ? 'group-hover:opacity-0 transition-opacity' : ''}>vs</span>
              {nameA || nameB ? (
                <ArrowLeftRight className="absolute h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100 text-[var(--text-primary)]" />
              ) : null}
            </button>
          </div>

          <Corner side="blue" fighter={fighterB} loading={loading} onOpenProfile={setProfileName}>
            <FighterSelect
              label={t('predictor.blueCorner', 'Blue corner')}
              corner="blue"
              value={nameB}
              fighters={fighters}
              disabledFighterName={nameA}
              placeholder={t('predictor.searchPlaceholder', 'Search fighter by name...')}
              onChange={(val) => chooseCorner('b', val)}
            />
          </Corner>
        </div>

        <button
          type="button"
          onClick={score}
          disabled={!canScore || predicting || loading}
          className="primary-action flex min-h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-sm px-6 text-base"
        >
          {predicting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
          {predicting ? t('predictor.predicting', 'Judges are scoring...') : canScore ? t('predictor.predictMatchup', 'Score the fight') : t('predictor.pickTwoPrompt', 'Pick both corners first')}
          {canScore && !predicting ? <ArrowRight className="h-5 w-5" /> : null}
        </button>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Scorecard prediction={prediction} fighterA={fighterA} fighterB={fighterB} />
          <Drivers factors={prediction?.main_factors ?? []} redName={prediction?.fighter_a_profile.name ?? null} />
        </div>

        <TaleOfTape fighterA={fighterA} fighterB={fighterB} />
      </div>

      {profileName ? (
        <FighterProfileModal
          key={profileName}
          name={profileName}
          onClose={() => setProfileName(null)}
          onSelectFighter={setProfileName}
        />
      ) : null}
    </div>
  )
}

function resultsThrough(dataThrough: string | null, lang: string): string | undefined {
  const date = dataThrough ? new Date(`${dataThrough}T00:00:00`) : null
  if (!date || Number.isNaN(date.getTime())) return undefined
  const label = date.toLocaleDateString(localeTag(lang), { month: 'short', day: 'numeric', year: 'numeric' })
  return L(lang, `Resultados até ${label}`, `Results through ${label}`, `Résultats jusqu’au ${label}`, `Resultados hasta ${label}`)
}

/** The numbers behind the model, in one open row: no boxes, a rule between columns on wide screens. */
function Scoreboard({ cells }: { cells: { label: string; value: string; note?: string; alert?: boolean; onlineDot?: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label} className="min-w-0 lg:border-l lg:border-[var(--border-subtle)] lg:pl-6 lg:first:border-l-0 lg:first:pl-0">
          <p className="text-label font-semibold text-[var(--text-muted)]">{cell.label}</p>
          <p className={`mt-1 flex items-center gap-2 font-display text-2xl font-bold leading-none tabular-nums sm:text-3xl ${cell.alert ? 'text-[var(--text-red)]' : 'text-[var(--text-primary)]'}`}>
            {cell.onlineDot ? (
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-[var(--accent-green)] animate-pulse" aria-hidden="true" />
            ) : null}
            <span className="min-w-0 truncate">{cell.value}</span>
          </p>
          {cell.note ? <p className="mt-1 text-xs text-[var(--text-muted)]">{cell.note}</p> : null}
        </div>
      ))}
    </div>
  )
}

function Corner({
  side,
  fighter,
  loading,
  onOpenProfile,
  children,
}: {
  side: 'red' | 'blue'
  fighter: FighterProfile | null
  loading: boolean
  onOpenProfile: (name: string) => void
  children: ReactNode
}) {
  const { i18n } = useTranslation()
  const { imageByName } = useFighterImages()
  const block = side === 'red' ? 'bg-[var(--red)] text-white' : 'bg-[var(--blue)] text-white'

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className={`${block} flex items-center justify-between gap-3 px-4 py-2.5`}>
        <span className="poster-display text-lg sm:text-xl">
          {side === 'red' ? L(i18n.language, 'Canto vermelho', 'Red corner', 'Coin rouge', 'Esquina roja') : L(i18n.language, 'Canto azul', 'Blue corner', 'Coin bleu', 'Esquina azul')}
        </span>
        {fighter ? <span className="truncate text-xs font-bold">{fighter.division ? getDivisionName(fighter.division, i18n.language) : fighter.stance}</span> : null}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        {children}

        {fighter ? (
          <FighterSheet fighter={fighter} imageUrl={getFighterImageUrl(fighter.name, imageByName, fighter.image_url)} onOpenProfile={() => onOpenProfile(fighter.name)} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center rounded-sm border border-dashed border-[var(--border-default)] px-4 py-10 text-center">
            <p className="poster-display text-3xl sm:text-4xl text-[var(--text-muted)]">{loading ? '...' : L(i18n.language, 'A definir', 'TBA', 'À définir', 'Por definir')}</p>
            <p className="mt-1 text-xs font-bold text-[var(--text-muted)]">{L(i18n.language, 'Aguardando lutador', 'To be announced', 'En attente d’un combattant', 'Peleador por anunciar')}</p>
          </div>
        )}
      </div>
    </section>
  )
}

function FighterSheet({ fighter, imageUrl, onOpenProfile }: { fighter: FighterProfile; imageUrl: string | null; onOpenProfile: () => void }) {
  const { i18n } = useTranslation()
  const record = `${fighter.wins ?? 0}-${fighter.losses ?? 0}${fighter.draws ? `-${fighter.draws}` : ''}`
  const place = translateHometown(fighter.hometown ?? fighter.country, i18n.language)
  const rows: [string, string][] = [
    [L(i18n.language, 'Idade', 'Age', 'Âge', 'Edad'), fighter.age ? `${fighter.age.toFixed(0)}` : '—'],
    [L(i18n.language, 'Altura', 'Height', 'Taille', 'Estatura'), fighter.height_cm ? `${fighter.height_cm.toFixed(0)} cm` : '—'],
    [L(i18n.language, 'Envergadura', 'Reach', 'Allonge', 'Alcance'), fighter.reach_cm ? `${fighter.reach_cm.toFixed(0)} cm` : '—'],
    [L(i18n.language, 'Peso', 'Weight', 'Poids', 'Peso'), fighter.weight_lbs ? `${fighter.weight_lbs.toFixed(0)} lb` : '—'],
    [L(i18n.language, 'Base', 'Stance', 'Garde', 'Guardia'), fighter.stance || '—'],
    [L(i18n.language, 'Taxa de vitória', 'Win rate', 'Taux de victoire', 'Porcentaje de victorias'), fighter.win_rate != null ? `${(fighter.win_rate * 100).toFixed(1)}%` : '—'],
  ]

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onOpenProfile}
          className="shrink-0 cursor-pointer transition hover:scale-105"
          title={L(i18n.language, `Abrir perfil completo de ${fighter.name}`, `Open ${fighter.name}'s full profile`, `Ouvrir le profil complet de ${fighter.name}`, `Abrir el perfil completo de ${fighter.name}`)}
        >
          <FighterAvatar name={fighter.name} imageUrl={imageUrl} className="h-24 w-24 sm:h-28 sm:w-28" />
        </button>
        <div className="min-w-0">
          <h3 className="poster-display flex flex-wrap items-center gap-2 text-2xl leading-none sm:text-3xl text-[var(--text-primary)]">
            <button
              type="button"
              onClick={onOpenProfile}
              className="truncate transition hover:text-[var(--ink)] cursor-pointer"
            >
              {fighter.name}
            </button>
            <span className="text-xs font-bold text-[var(--text-muted)]">({record})</span>
          </h3>
          {fighter.nickname ? (
            <p className="mt-1 truncate text-xs font-semibold text-[var(--ink)]">
              “{fighter.nickname}”
            </p>
          ) : null}
          {place ? <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{place}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {fighter.belt ? <ChampionBelt /> : null}
            <FighterBadges badges={fighter.badges} />
            <FlagList fighter={fighter} />
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--border-subtle)] pt-3 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="truncate text-label text-[var(--text-muted)]">{label}</dt>
            <dd className="poster-display mt-1 truncate text-lg text-[var(--text-primary)]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Scorecard({
  prediction,
  fighterA,
  fighterB,
}: {
  prediction: PredictionResponse | null
  fighterA: FighterProfile | null
  fighterB: FighterProfile | null
}) {
  const { i18n } = useTranslation()
  const titleFightInfo = getMatchupTitleFight(
    prediction?.fighter_a_profile ?? fighterA,
    prediction?.fighter_b_profile ?? fighterB,
  )

  return (
    <section className="overflow-hidden rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl leading-none">{L(i18n.language, 'Chance de vitória', 'Chance of winning', 'Chances de victoire', 'Probabilidad de victoria')}</h2>
          {titleFightInfo?.title_fight ? <TitleFightBadge fight={titleFightInfo} /> : null}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {prediction ? (
          <>
            <ProbabilityBand nameA={prediction.fighter_a_profile.name} nameB={prediction.fighter_b_profile.name} probabilityA={prediction.fighter_a_probability} />
            <p className="text-base font-semibold">{predictionSentence(i18n.language, prediction.predicted_winner, prediction.probability)}</p>
            <p className="text-[15px] leading-6 text-[var(--muted)]">{localizePredictionMessage(prediction.message, prediction.predicted_winner, i18n.language)}</p>
            <DataConfidenceNote confidence={prediction.data_confidence} />
          </>
        ) : (
          <p className="py-6 text-base text-[var(--muted)]">
            {fighterA && fighterB
              ? L(i18n.language, 'Clique em “Simular combate” para ver a chance de vitória estimada pelo modelo.', 'Press “Predict matchup” to see the model’s estimated chance of winning.', 'Appuyez sur « Prédire le combat » pour voir la probabilité de victoire estimée par le modèle.', 'Pulsa “Pronosticar la pelea” para ver la probabilidad de victoria estimada por el modelo.')
              : L(i18n.language, 'Escolha os dois lutadores para ver a chance de vitória estimada pelo modelo.', 'Choose both fighters to see the model’s estimated chance of winning.', 'Choisissez les deux combattants pour voir la probabilité de victoire estimée par le modèle.', 'Elige a los dos peleadores para ver la probabilidad de victoria estimada por el modelo.')}
          </p>
        )}
      </div>
    </section>
  )
}

/** The factors behind the estimate; each bar takes the colour of the corner it favours. */
function Drivers({ factors, redName }: { factors: MainFactor[]; redName: string | null }) {
  const { i18n } = useTranslation()
  const max = Math.max(...factors.map((factor) => factor.magnitude), 0.01)
  const rows = factors.slice(0, 6)

  return (
    <section className="overflow-hidden rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-4 py-3">
        <span className="poster-display text-lg text-[var(--text-primary)]">{L(i18n.language, 'Fatores determinantes', 'Why the model leans', 'Pourquoi le modèle penche', 'Por qué se inclina el modelo')}</span>
        
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {rows.length ? (
          rows.map((factor, index) => (
            <div key={factor.feature}>
              <div className="flex items-end gap-2">
                <span className="poster-display w-5 shrink-0 text-lg text-[var(--ink)]">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold sm:text-sm text-[var(--text-primary)]">
                  {localizeFeature(factor.feature, i18n.language)}
                </span>
                <span className="poster-leader border-dotted border-[var(--border-default)]" aria-hidden="true" />
                <span className="poster-display text-sm text-[var(--text-secondary)]">{factor.impact}</span>
              </div>
              <div className="mt-1 h-2 rounded-sm overflow-hidden bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
                <div className={`h-full ${factor.impact === redName ? 'bg-[var(--red)]' : 'bg-[var(--blue)]'}`} style={{ width: `${Math.min(100, (factor.magnitude / max) * 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {L(
                  i18n.language,
                  `${localizeFeature(factor.feature, i18n.language)} pesou a favor de ${factor.impact}.`,
                  factor.explanation,
                  `${localizeFeature(factor.feature, i18n.language)} a pesé en faveur de ${factor.impact}.`,
                  `${localizeFeature(factor.feature, i18n.language)} inclinó el pronóstico a favor de ${factor.impact}.`,
                )}
              </p>
            </div>
          ))
        ) : (
          <>
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-end gap-2 text-[var(--text-muted)]">
                <span className="poster-display w-6 shrink-0 text-xl text-[var(--text-muted)]/40">{n}</span>
                <span className="poster-leader border-dotted border-[var(--border-default)]" aria-hidden="true" />
                <span className="text-xs font-bold text-[var(--text-muted)]/60">--</span>
              </div>
            ))}
            <p className="text-sm font-medium leading-6 text-[var(--text-muted)]">
              {L(i18n.language, 'Simule a luta para ver os fatores que definiram o favoritismo.', 'Score the fight to see the three numbers that pushed the odds, ranked.', 'Calculez le combat pour voir les chiffres qui ont fait pencher les cotes, du plus fort au plus faible.', 'Pronostica la pelea para ver los tres números que movieron las probabilidades, ordenados.')}
            </p>
          </>
        )}
      </div>
    </section>
  )
}

type TapeRow = { label: string; a: number | null; b: number | null; unit?: string; better: 'high' | 'low' | 'none'; pct?: boolean }

function TaleOfTape({ fighterA, fighterB }: { fighterA: FighterProfile | null; fighterB: FighterProfile | null }) {
  const { i18n } = useTranslation()

  const rows: TapeRow[] = [
    { label: L(i18n.language, 'Idade', 'Age', 'Âge', 'Edad'), a: fighterA?.age ?? null, b: fighterB?.age ?? null, better: 'none' },
    { label: L(i18n.language, 'Altura (cm)', 'Height (cm)', 'Taille (cm)', 'Estatura (cm)'), a: fighterA?.height_cm ?? null, b: fighterB?.height_cm ?? null, better: 'high' },
    { label: L(i18n.language, 'Envergadura (cm)', 'Reach (cm)', 'Allonge (cm)', 'Alcance (cm)'), a: fighterA?.reach_cm ?? null, b: fighterB?.reach_cm ?? null, better: 'high' },
    { label: L(i18n.language, 'Vitórias', 'Wins', 'Victoires', 'Victorias'), a: fighterA?.wins ?? null, b: fighterB?.wins ?? null, better: 'high' },
    { label: L(i18n.language, 'Derrotas', 'Losses', 'Défaites', 'Derrotas'), a: fighterA?.losses ?? null, b: fighterB?.losses ?? null, better: 'low' },
    { label: L(i18n.language, 'Taxa de vitória', 'Win rate', 'Taux de victoire', 'Porcentaje de victorias'), a: fighterA?.win_rate ?? null, b: fighterB?.win_rate ?? null, better: 'high', pct: true },
    { label: L(i18n.language, 'Precisão de golpes', 'Striking accuracy', 'Précision des coups', 'Precisión de golpes'), a: fighterA?.sig_str_acc ?? null, b: fighterB?.sig_str_acc ?? null, better: 'high', pct: true },
    { label: L(i18n.language, 'Precisão de quedas', 'Takedown accuracy', 'Précision des amenées', 'Precisión de derribos'), a: fighterA?.takedown_acc ?? null, b: fighterB?.takedown_acc ?? null, better: 'high', pct: true },
  ]
  const ready = Boolean(fighterA && fighterB)

  return (
    <section className="overflow-hidden rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-4 py-3">
        <span className="poster-display text-lg text-[var(--text-primary)]">{L(i18n.language, 'Raio-x dos lutadores', 'Tale of the tape', 'La fiche comparative', 'Comparativa de peleadores')}</span>
        <span className="hidden text-label font-bold sm:inline text-[var(--text-muted)]">{L(i18n.language, 'Destaque = vantagem', 'Highlight = edge', 'Surligné = avantage', 'Resaltado = ventaja')}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] border-b border-[var(--border-subtle)] text-center">
        <span className="poster-display truncate bg-[var(--red)] px-3 py-2 text-base text-white sm:text-lg">{fighterA?.name ?? L(i18n.language, 'Canto vermelho', 'Red corner', 'Coin rouge', 'Esquina roja')}</span>
        <span className="w-24 shrink-0 sm:w-40" />
        <span className="poster-display truncate bg-[var(--blue)] px-3 py-2 text-base text-white sm:text-lg">{fighterB?.name ?? L(i18n.language, 'Canto azul', 'Blue corner', 'Coin bleu', 'Esquina azul')}</span>
      </div>

      <div>
        {rows.map((row) => {
          const edge = ready ? edgeOf(row) : null
          return (
            <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-[var(--border-subtle)] last:border-b-0 py-1">
              <Cell value={row.a} row={row} winning={edge === 'a'} ready={ready} />
              <span className="w-24 shrink-0 px-1 text-center text-label font-semibold leading-tight text-[var(--text-secondary)] sm:w-40">{row.label}</span>
              <Cell value={row.b} row={row} winning={edge === 'b'} ready={ready} />
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Cell({ value, row, winning, ready }: { value: number | null; row: TapeRow; winning: boolean; ready: boolean }) {
  const text = !ready || value == null ? '--' : row.pct ? `${(value * 100).toFixed(1)}%` : Number.isInteger(value) ? `${value}` : value.toFixed(1)
  return (
    <span className="px-2 py-1.5 text-center">
      <span className={`poster-display inline-block px-2 text-xl sm:text-2xl ${winning ? 'rounded bg-[var(--tape)] text-[var(--on-tape)]' : ready ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{text}</span>
    </span>
  )
}

function edgeOf(row: TapeRow): 'a' | 'b' | null {
  if (row.better === 'none' || row.a == null || row.b == null || row.a === row.b) return null
  const aWins = row.better === 'high' ? row.a > row.b : row.a < row.b
  return aWins ? 'a' : 'b'
}
