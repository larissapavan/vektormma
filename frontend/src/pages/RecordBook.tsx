import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Trophy } from 'lucide-react'

import { L, uiLang, type UiLang } from '../i18n/lang'
import { FighterProfileModal } from '../shared/components/FighterProfileModal'
import { LoadingSkeleton } from '../shared/components/LoadingSkeleton'
import { SectionHeading } from '../shared/components/SectionHeading'
import { useRecordBook } from '../shared/hooks/useRecordBook'
import type { RecordBookCategory, RecordBookStat } from '../shared/types/api'

const CATEGORY_BLURBS: Record<string, string> = {
  Fights: 'Wins, finishes, streaks and title wins across a whole career.',
  Time: 'How long fights last and how much of that time a fighter spends in control.',
  Striking: 'Significant strikes, accuracy, defense and knockdowns.',
  Grappling: 'Takedowns, takedown defense and submission attempts.',
}

const CATEGORY_NAMES_PT: Record<string, string> = {
  Fights: 'Lutas & Vitórias',
  Time: 'Tempo de Combate',
  Striking: 'Golpes & Trocação',
  Grappling: 'Quedas & Chão',
}

const STAT_TITLES_PT: Record<string, string> = {
  TotalFights: 'Total de Lutas',
  Wins: 'Vitórias',
  Finishes: 'Vitórias pela Via Rápida (Nocautes e Finalizações)',
  KOTKOWins: 'Vitórias por Nocaute (KO/TKO)',
  SubmissionWins: 'Vitórias por Finalização',
  DecisionWins: 'Vitórias por Decisão',
  WinStreak: 'Maior Sequência de Vitórias',
  TitleFightWins: 'Vitórias em Disputas de Cinturão',
  TotalAwards: 'Total de Bônus da Noite',
  AverageFightTimeShort: 'Menor Média de Tempo de Luta',
  AverageFightTimeLong: 'Maior Média de Tempo de Luta',
  TotalFightTime: 'Tempo Total de Luta no Octógono',
  ControlTime: 'Tempo Total de Controle',
  ControlTimePercentage: 'Porcentagem de Tempo de Controle',
  TopPositionTime: 'Tempo de Controle por Cima no Chão',
  TopPositionTimePercentage: 'Porcentagem de Tempo por Cima no Chão',
  BottomPositionTime: 'Tempo de Chão por Baixo',
  BottomPositionTimePercentage: 'Porcentagem de Tempo por Baixo',
  Knockdowns: 'Knockdowns Aplicados',
  KnockdownsAverage: 'Média de Knockdowns (por 15 min)',
  SigStrikesLanded: 'Golpes Traumáticos Conectados',
  SigStrikesAccuracy: 'Precisão de Golpes Traumáticos',
  SLpM: 'Golpes Traumáticos Conectados por Minuto',
  SignificantStrikesDifferential: 'Saldo Diferencial de Golpes Traumáticos',
  SignificantStrikesDefense: 'Defesa de Golpes Traumáticos',
  SApM: 'Golpes Traumáticos Absorvidos por Minuto',
  TotalStrikesLanded: 'Total de Golpes Conectados',
  TakedownsLanded: 'Quedas Aplicadas',
  TakedownsAccuracy: 'Precisão de Quedas',
  TakedownsDefense: 'Defesa de Quedas',
  SubmissionsAttempted: 'Tentativas de Finalização',
  SubmissionsAverage: 'Média de Tentativas de Finalização (por 15 min)',
}

const STAT_NOTES_PT: Record<string, string> = {
  'Minimum 5 UFC Fights': 'Mínimo de 5 lutas no UFC',
  'Minimum 5 UFC Fights and 500 Significant Strike Attempts': 'Mínimo de 5 lutas no UFC e 500 tentativas de golpes traumáticos',
  'Minimum 5 UFC Fights and 500 Strike Attempts by Opponents': 'Mínimo de 5 lutas no UFC e 500 tentativas de golpes pelos oponentes',
  'Minimum 5 UFC Fights and 20 Takedown Attempts': 'Mínimo de 5 lutas no UFC e 20 tentativas de queda',
  'Minimum 5 UFC Fights and 20 Takedown Attempts by Opponent': 'Mínimo de 5 lutas no UFC e 20 tentativas de queda pelo oponente',
}

const CATEGORY_NAMES_FR: Record<string, string> = {
  Fights: 'Combats et victoires',
  Time: 'Temps de combat',
  Striking: 'Frappe',
  Grappling: 'Lutte au sol',
}

const STAT_TITLES_FR: Record<string, string> = {
  TotalFights: 'Total de combats',
  Wins: 'Victoires',
  Finishes: 'Victoires avant la limite',
  KOTKOWins: 'Victoires par KO/TKO',
  SubmissionWins: 'Victoires par soumission',
  DecisionWins: 'Victoires par décision',
  WinStreak: 'Plus longue série de victoires',
  TitleFightWins: 'Victoires en combat de titre',
  TotalAwards: 'Total des bonus de la soirée',
  AverageFightTimeShort: 'Temps de combat moyen le plus court',
  AverageFightTimeLong: 'Temps de combat moyen le plus long',
  TotalFightTime: 'Temps de combat total dans l’octogone',
  ControlTime: 'Temps de contrôle total',
  ControlTimePercentage: 'Pourcentage de temps de contrôle',
  TopPositionTime: 'Temps de contrôle en position haute',
  TopPositionTimePercentage: 'Pourcentage de temps en position haute',
  BottomPositionTime: 'Temps au sol en position basse',
  BottomPositionTimePercentage: 'Pourcentage de temps en position basse',
  Knockdowns: 'Knockdowns infligés',
  KnockdownsAverage: 'Moyenne de knockdowns (par 15 min)',
  SigStrikesLanded: 'Coups significatifs réussis',
  SigStrikesAccuracy: 'Précision des coups significatifs',
  SLpM: 'Coups significatifs réussis par minute',
  SignificantStrikesDifferential: 'Différentiel de coups significatifs',
  SignificantStrikesDefense: 'Défense des coups significatifs',
  SApM: 'Coups significatifs absorbés par minute',
  TotalStrikesLanded: 'Total des coups réussis',
  TakedownsLanded: 'Amenées au sol réussies',
  TakedownsAccuracy: 'Précision des amenées au sol',
  TakedownsDefense: 'Défense des amenées au sol',
  SubmissionsAttempted: 'Tentatives de soumission',
  SubmissionsAverage: 'Moyenne des tentatives de soumission (par 15 min)',
}

const STAT_NOTES_FR: Record<string, string> = {
  'Minimum 5 UFC Fights': 'Au moins 5 combats à l’UFC',
  'Minimum 5 UFC Fights and 500 Significant Strike Attempts': 'Au moins 5 combats à l’UFC et 500 tentatives de coups significatifs',
  'Minimum 5 UFC Fights and 500 Strike Attempts by Opponents': 'Au moins 5 combats à l’UFC et 500 tentatives de coups des adversaires',
  'Minimum 5 UFC Fights and 20 Takedown Attempts': 'Au moins 5 combats à l’UFC et 20 tentatives d’amenée au sol',
  'Minimum 5 UFC Fights and 20 Takedown Attempts by Opponent': 'Au moins 5 combats à l’UFC et 20 tentatives d’amenée au sol de l’adversaire',
}

const CATEGORY_NAMES_ES: Record<string, string> = {
  Fights: 'Peleas y victorias',
  Time: 'Tiempo de pelea',
  Striking: 'Golpeo',
  Grappling: 'Lucha en el suelo',
}

const STAT_TITLES_ES: Record<string, string> = {
  TotalFights: 'Total de peleas',
  Wins: 'Victorias',
  Finishes: 'Victorias antes del límite',
  KOTKOWins: 'Victorias por KO/TKO',
  SubmissionWins: 'Victorias por sumisión',
  DecisionWins: 'Victorias por decisión',
  WinStreak: 'Mayor racha de victorias',
  TitleFightWins: 'Victorias en peleas por el título',
  TotalAwards: 'Total de bonos de la noche',
  AverageFightTimeShort: 'Menor tiempo promedio de pelea',
  AverageFightTimeLong: 'Mayor tiempo promedio de pelea',
  TotalFightTime: 'Tiempo total de pelea en el octágono',
  ControlTime: 'Tiempo total de control',
  ControlTimePercentage: 'Porcentaje de tiempo de control',
  TopPositionTime: 'Tiempo de control en posición superior',
  TopPositionTimePercentage: 'Porcentaje de tiempo en posición superior',
  BottomPositionTime: 'Tiempo en el suelo en posición inferior',
  BottomPositionTimePercentage: 'Porcentaje de tiempo en posición inferior',
  Knockdowns: 'Knockdowns conseguidos',
  KnockdownsAverage: 'Promedio de knockdowns (por 15 min)',
  SigStrikesLanded: 'Golpes significativos conectados',
  SigStrikesAccuracy: 'Precisión de golpes significativos',
  SLpM: 'Golpes significativos conectados por minuto',
  SignificantStrikesDifferential: 'Diferencial de golpes significativos',
  SignificantStrikesDefense: 'Defensa de golpes significativos',
  SApM: 'Golpes significativos recibidos por minuto',
  TotalStrikesLanded: 'Total de golpes conectados',
  TakedownsLanded: 'Derribos conseguidos',
  TakedownsAccuracy: 'Precisión de derribos',
  TakedownsDefense: 'Defensa de derribos',
  SubmissionsAttempted: 'Intentos de sumisión',
  SubmissionsAverage: 'Promedio de intentos de sumisión (por 15 min)',
}

const STAT_NOTES_ES: Record<string, string> = {
  'Minimum 5 UFC Fights': 'Mínimo de 5 peleas en la UFC',
  'Minimum 5 UFC Fights and 500 Significant Strike Attempts': 'Mínimo de 5 peleas en la UFC y 500 intentos de golpes significativos',
  'Minimum 5 UFC Fights and 500 Strike Attempts by Opponents': 'Mínimo de 5 peleas en la UFC y 500 intentos de golpes de los rivales',
  'Minimum 5 UFC Fights and 20 Takedown Attempts': 'Mínimo de 5 peleas en la UFC y 20 intentos de derribo',
  'Minimum 5 UFC Fights and 20 Takedown Attempts by Opponent': 'Mínimo de 5 peleas en la UFC y 20 intentos de derribo del rival',
}

type Tables = Record<Exclude<UiLang, 'en'>, Record<string, string>>

function localizedLabel(language: string, english: string, tables: Tables, key: string) {
  const lang = uiLang(language)
  return lang === 'en' ? english : (tables[lang][key] ?? english)
}

export function RecordBook() {
  const { t, i18n } = useTranslation()
  const { data, loading, error } = useRecordBook()
  const [categoryName, setCategoryName] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)

  const categories = data?.categories ?? []
  const active: RecordBookCategory | undefined = categories.find((category) => category.name === categoryName) ?? categories[0]

  const getBlurb = (name?: string) => {
    if (!name) return ''
    const key = `recordBook.blurbs.${name}`
    const translated = t(key)
    return translated !== key ? translated : (CATEGORY_BLURBS[name] ?? '')
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <section>
        <SectionHeading
          level={1}
          title={t('recordBook.title')}
          description={t('recordBook.description')}
        />

        {categories.length ? (
          <div role="group" aria-label={L(i18n.language, 'Categorias de recordes', 'Record categories', 'Catégories de records', 'Categorías de récords')} className="mt-4 inline-flex max-w-full overflow-x-auto border-2 border-[var(--rule)] bg-[var(--card-bg)] chip-scroll">
            {categories.map((category) => (
              <button
                key={category.name}
                type="button"
                aria-pressed={category.name === active?.name}
                onClick={() => setCategoryName(category.name)}
                className={`min-h-11 shrink-0 px-4 text-sm font-semibold transition-colors sm:px-5 ${
                  category.name === active?.name
                    ? 'bg-[var(--ink)] text-[var(--on-ink)]'
                    : 'text-[var(--ink)] hover:bg-[var(--panel)]'
                }`}
              >
                {localizedLabel(i18n.language, category.name, { pt: CATEGORY_NAMES_PT, fr: CATEGORY_NAMES_FR, es: CATEGORY_NAMES_ES }, category.name)}
                <span className="ml-1.5 opacity-70">{category.stats.length}</span>
              </button>
            ))}
          </div>
        ) : null}
        {active ? <p className="mt-2 text-sm text-[var(--text-muted)]">{getBlurb(active.name)}</p> : null}
      </section>

      {error ? <p role="alert" className="error-note">{error}</p> : null}

      {loading ? (
        <section className="grid gap-2.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-[48px]" />
          ))}
        </section>
      ) : active ? (
        <section className="grid gap-2.5">
          {active.stats.map((stat) => (
            <StatCard key={stat.key} stat={stat} onOpenProfile={setProfileName} />
          ))}
        </section>
      ) : null}

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

function StatCard({ stat, onOpenProfile }: { stat: RecordBookStat; onOpenProfile: (name: string) => void }) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const panelId = `stat-${stat.key}`
  const title = localizedLabel(i18n.language, stat.title, { pt: STAT_TITLES_PT, fr: STAT_TITLES_FR, es: STAT_TITLES_ES }, stat.key)
  const note = stat.note ? localizedLabel(i18n.language, stat.note, { pt: STAT_NOTES_PT, fr: STAT_NOTES_FR, es: STAT_NOTES_ES }, stat.note) : stat.note

  return (
    <section className="surface-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition duration-150 hover:bg-[var(--bg-surface-subtle)] sm:px-4"
      >
        <Trophy className="h-4 w-4 shrink-0 text-[var(--ink)]" />
        <h3 className="broadcast-label text-xs text-[var(--text-main)]">{title}</h3>
        <span className="theme-muted text-xs">({stat.leaders.length})</span>
        <ChevronDown className={`theme-muted ml-auto h-4 w-4 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div id={panelId} className="border-t border-[var(--line-soft)] px-3 py-3 sm:px-4">
          {note ? <p className="theme-muted mb-2 text-label leading-4">{note}</p> : null}
          <ol className="lg:columns-2 lg:gap-x-8">
            {stat.leaders.map((leader, index) => (
              <li key={`${leader.rank}-${leader.fighter}-${index}`} className="break-inside-avoid">
                <LeaderRow leader={leader} onOpenProfile={onOpenProfile} />
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  )
}

function LeaderRow({
  leader,
  onOpenProfile,
}: {
  leader: RecordBookStat['leaders'][number]
  onOpenProfile: (name: string) => void
}) {
  const { i18n } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => onOpenProfile(leader.fighter)}
      aria-label={L(i18n.language, `${leader.fighter}, #${leader.rank}. Ver perfil`, `${leader.fighter}, rank ${leader.rank}. View profile`, `${leader.fighter}, rang ${leader.rank}. Voir le profil`, `${leader.fighter}, puesto ${leader.rank}. Ver perfil`)}
      className="flex w-full cursor-pointer items-center text-left gap-2.5 px-2 py-1.5 transition-colors hover:bg-[var(--gold-fill)] focus-visible:bg-[var(--gold-fill)] focus-visible:outline-none"
    >
      <span className="type-num w-4 shrink-0 text-right text-label text-[var(--text-muted)]">{leader.rank}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-[var(--text-main)]">{leader.fighter}</p>
      </div>
      <span className="data-value shrink-0 text-sm font-bold text-[var(--text-main)]">{leader.value}</span>
    </button>
  )
}
