import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Trophy, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { L } from '../../i18n/lang'
import { getDivisionName } from '../data/divisions'
import type { FightRecord } from '../types/api'
import type { TimelineEra } from './SeasonTimeline'

/** The division a title fight was for: the fight's own, else one named in its notes or event, else the fighter's. */
function resolveFightDivision(fight: FightRecord, fallbackDivision?: string | null): string | null {
  if (fight.weight_class && !/catch/i.test(fight.weight_class)) {
    return fight.weight_class
  }
  const text = `${fight.notes || ''} ${fight.event || ''} ${fight.event_name || ''}`
  const match = text.match(/\b(Women's\s+Featherweight|Women's\s+Bantamweight|Women's\s+Flyweight|Women's\s+Strawweight|Light\s+Heavyweight|Super\s+Lightweight|Featherweight|Bantamweight|Flyweight|Strawweight|Welterweight|Middleweight|Heavyweight|Lightweight|Cruiserweight)\b/i)
  if (match) {
    const raw = match[1].toLowerCase()
    if (raw.includes('super light') || raw === 'lightweight') return 'Lightweight'
    if (raw.includes('light heavy')) return 'Light Heavyweight'
    if (raw.includes('women') && raw.includes('feather')) return "Women's Featherweight"
    if (raw.includes('women') && raw.includes('bantam')) return "Women's Bantamweight"
    if (raw.includes('women') && raw.includes('fly')) return "Women's Flyweight"
    if (raw.includes('women') && raw.includes('straw')) return "Women's Strawweight"
    if (raw.includes('feather')) return 'Featherweight'
    if (raw.includes('bantam')) return 'Bantamweight'
    if (raw.includes('fly')) return 'Flyweight'
    if (raw.includes('straw')) return 'Strawweight'
    if (raw.includes('welter')) return 'Welterweight'
    if (raw.includes('middle')) return 'Middleweight'
    if (raw.includes('heavy') || raw.includes('cruiser')) return 'Heavyweight'
  }
  return fallbackDivision || null
}

/**
 * The bouts of one season of a fighter's career, opened from the season timeline at the foot of a fighter profile.
 * Shared by the UFC profile and the profile of every other organization; it sits over the profile's lower edge.
 */
export function SeasonFightsPanel({
  era,
  eras,
  onSelectEra,
  onSelectFighter,
  fallbackDivision,
  defaultOrganization,
  methodLabel,
}: {
  era: TimelineEra | null
  eras: TimelineEra[]
  onSelectEra: (era: TimelineEra | null) => void
  onSelectFighter: (name: string) => void
  fallbackDivision?: string | null
  /** The organization written on a bout that does not name one ("UFC", "ONE"). */
  defaultOrganization: string
  methodLabel: (fight: FightRecord) => string | null
}) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const index = era ? eras.findIndex((item) => item.year === era.year) : -1

  return (
    <AnimatePresence>
      {era && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="absolute bottom-[150px] sm:bottom-[166px] left-2 right-2 sm:left-6 sm:right-6 lg:left-auto lg:right-8 lg:w-[620px] z-40 border border-[var(--rule)] bg-[#0C0D14]/98 p-3 sm:p-5 flex flex-col max-h-[calc(100%_-_170px)] sm:max-h-[min(440px,calc(100%_-_186px))]"
        >
          {/* Top Bar: Ano, Balanço, Milestones e Navegação */}
          <div className="flex items-center justify-between border-b border-[var(--rule)] pb-2.5 sm:pb-3 mb-2.5 sm:mb-3 shrink-0 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (index > 0) onSelectEra(eras[index - 1])
                  }}
                  disabled={index <= 0}
                  className="h-7 w-7 border border-[var(--rule)] bg-[var(--panel)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--panel)] disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                  title={L(lang, 'Ano anterior', 'Previous year', 'Année précédente', 'Año anterior')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (index < eras.length - 1) onSelectEra(eras[index + 1])
                  }}
                  disabled={index >= eras.length - 1}
                  className="h-7 w-7 border border-[var(--rule)] bg-[var(--panel)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--panel)] disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
                  title={L(lang, 'Próximo ano', 'Next year', 'Année suivante', 'Año siguiente')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="font-display font-black text-sm sm:text-lg text-[var(--ink)] whitespace-nowrap">
                    {L(lang, 'Temporada', 'Season', 'Saison', 'Temporada')} {era.year}
                  </span>
                  <span className="text-label sm:text-xs font-bold text-[var(--gold)] bg-[var(--gold-fill)] border border-[var(--gold)] px-1.5 sm:px-2 py-0.5 rounded-sm shrink-0">
                    {era.wins}{L(lang, 'V', 'W', 'V', 'V')} - {era.losses}{L(lang, 'D', 'L', 'D', 'D')}
                  </span>
                </div>
                <p className="font-sans text-label text-[var(--muted)] truncate mt-0.5">
                  {era.fights.length} {era.fights.length === 1 ? L(lang, 'combate disputado', 'bout fought', 'combat disputé', 'pelea disputada') : L(lang, 'combates disputados', 'bouts fought', 'combats disputés', 'peleas disputadas')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {era.milestone && (
                <div className="hidden md:inline-flex items-center gap-1.5 rounded-sm bg-[var(--gold-fill)] border border-[var(--gold)] px-2.5 py-1 text-label font-bold text-[var(--gold)]">
                  <Trophy className="h-3 w-3" />
                  <span>{era.milestone}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => onSelectEra(null)}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-sm border border-[var(--rule)] bg-[var(--panel)] hover:bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--ink)] transition flex items-center justify-center cursor-pointer"
                title={L(lang, 'Fechar (Esc)', 'Close (Esc)', 'Fermer (échap)', 'Cerrar (Esc)')}
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>

          {/* Lista Completa de Combates do Ano */}
          <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden no-scrollbar space-y-2 pr-0.5 sm:pr-1">
            {era.fights.map((fight, idx) => {
              const isWin = fight.result === 'win'
              const isLoss = fight.result === 'loss'
              const resultLabel = isWin
                ? L(lang, 'Vitória', 'Win', 'Victoire', 'Victoria')
                : isLoss
                  ? L(lang, 'Derrota', 'Loss', 'Défaite', 'Derrota')
                  : (fight.result?.toUpperCase() || 'NC')

              return (
                <div
                  key={idx}
                  className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 bg-[var(--panel)] hover:bg-[var(--panel)] border border-[var(--rule)] hover:border-[var(--rule)] transition-all duration-200"
                >
                  {/* Left: Organization & Result pill, opponent & event */}
                  <div className="flex flex-col items-start sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0">
                    <div className="flex flex-wrap items-center sm:flex-col sm:flex-nowrap sm:items-stretch gap-1 min-w-0 max-w-full sm:shrink-0">
                      <span
                        className={`max-w-full truncate px-1.5 py-0.5 text-label font-semibold ${
                          fight.is_ufc !== false
                            ? 'border border-[var(--ink)] text-[var(--ink)]'
                            : 'border border-[var(--rule)] text-[var(--muted)]'
                        }`}
                      >
                        {fight.organization || (fight.is_ufc !== false ? defaultOrganization : 'MMA')}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-label font-semibold ${
                          isWin
                            ? 'bg-[var(--ink)] text-[var(--on-ink)] border border-[var(--ink)]'
                            : isLoss
                              ? 'border border-[var(--ink)] text-[var(--ink)]'
                              : 'border border-[var(--rule)] text-[var(--muted)]'
                        }`}
                      >
                        {resultLabel}
                      </span>
                    </div>

                    <div className="min-w-0 max-w-full flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectFighter(fight.opponent)
                        }}
                        className="font-display font-bold text-sm sm:text-base text-[var(--ink)] hover:text-[var(--gold)] transition truncate text-left cursor-pointer block leading-tight"
                        title={L(lang, `Ver perfil de ${fight.opponent}`, `View profile of ${fight.opponent}`, `Voir le profil de ${fight.opponent}`, `Ver el perfil de ${fight.opponent}`)}
                      >
                        vs. {fight.opponent}
                      </button>
                      <p className="font-sans text-label text-[var(--muted)] truncate mt-0.5">
                        {fight.event_name} {fight.date ? `• ${fight.date}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Right: Method, Round, Time & Badges */}
                  <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center border-t border-[var(--rule)] pt-1.5 sm:border-t-0 sm:pt-0 sm:shrink-0 text-left sm:text-right gap-1 min-w-0">
                    <p className="min-w-0 text-label sm:text-xs font-semibold text-[var(--ink)] truncate">
                      {methodLabel(fight) || L(lang, 'Decisão', 'Decision', 'Décision', 'Decisión')}
                    </p>
                    <p className="text-label text-[var(--muted)] shrink-0">
                      {fight.round ? L(lang, `${fight.round}º Round`, `Round ${fight.round}`, `Round ${fight.round}`, `Asalto ${fight.round}`) : ''} {fight.time ? `(${fight.time})` : ''}
                    </p>
                    {(fight.title_fight || fight.bmf_title || fight.interim_title) && (() => {
                      const division = resolveFightDivision(fight, fallbackDivision)
                      const divPt = division ? getDivisionName(division, 'pt') : ''
                      const divFr = division ? getDivisionName(division, 'fr') : ''
                      const divEs = division ? getDivisionName(division, 'es') : ''
                      const divEn = division ?? ''

                      if (fight.bmf_title) {
                        return (
                          <span className="inline-flex items-center gap-1 text-label font-bold text-[var(--gold)] mt-0.5 shrink-0">
                            {L(lang, 'Cinturão BMF', 'BMF title fight', 'Ceinture BMF', 'Pelea por el cinturón BMF')}
                          </span>
                        )
                      }

                      if (fight.interim_title) {
                        return (
                          <span className="inline-flex items-center gap-1 text-label font-bold text-[var(--ink)] mt-0.5 shrink-0">
                            {L(
                              lang,
                              divPt ? `Cinturão Interino (${divPt})` : 'Cinturão Interino',
                              divEn ? `Interim ${divEn} Title` : 'Interim Title Fight',
                              divFr ? `Ceinture intérimaire (${divFr})` : 'Ceinture intérimaire',
                              divEs ? `Cinturón interino (${divEs})` : 'Cinturón interino',
                            )}
                          </span>
                        )
                      }

                      return (
                        <span className="inline-flex items-center gap-1 text-label font-bold text-[var(--gold)] mt-0.5 shrink-0">
                          {L(
                            lang,
                            divPt ? `Disputa de Cinturão (${divPt})` : 'Disputa de Cinturão',
                            divEn ? `${divEn} Title Fight` : 'Title Fight',
                            divFr ? `Combat pour le titre (${divFr})` : 'Combat pour le titre',
                            divEs ? `Pelea por el título (${divEs})` : 'Pelea por el título',
                          )}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
