import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { L } from '../../i18n/lang'
import type { FightRecord } from '../types/api'

export interface TimelineEra {
  year: number
  label: string
  milestone?: string
  fights: FightRecord[]
  wins: number
  losses: number
  hasTitleFight: boolean
}

const DRAG_THRESHOLD_PX = 5

export function SeasonTimeline({
  eras,
  selectedYear,
  onSelect,
  lang,
}: {
  eras: TimelineEra[]
  selectedYear: number | null
  onSelect: (era: TimelineEra) => void
  lang: string
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false })
  const [edges, setEdges] = useState({ left: false, right: false })

  const syncEdges = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const left = el.scrollLeft > 4
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
  }, [])

  // Abre no ano mais recente: é o que o usuário quer ver primeiro.
  useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollLeft = el.scrollWidth
    syncEdges()
  }, [eras, syncEdges])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const observer = new ResizeObserver(syncEdges)
    observer.observe(el)
    return () => observer.disconnect()
  }, [syncEdges])

  // Roda do mouse (vertical) rola a régua na horizontal.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      const max = el.scrollWidth - el.clientWidth
      const next = el.scrollLeft + e.deltaY
      if (max <= 0 || (e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max)) return
      e.preventDefault()
      el.scrollLeft = Math.min(max, Math.max(0, next))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Centraliza o ano escolhido (também quando ele muda pelas setas do painel).
  useEffect(() => {
    const el = scrollerRef.current
    if (!el || selectedYear == null) return
    const item = el.querySelector<HTMLElement>(`[data-year="${selectedYear}"]`)
    if (!item) return
    el.scrollTo({ left: item.offsetLeft - (el.clientWidth - item.offsetWidth) / 2, behavior: 'smooth' })
  }, [selectedYear])

  const page = (direction: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: 'smooth' })
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    const el = scrollerRef.current
    if (!el) return
    drag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const el = scrollerRef.current
    if (!d.active || !el) return
    const dx = e.clientX - d.startX
    if (!d.moved && Math.abs(dx) > DRAG_THRESHOLD_PX) {
      d.moved = true
      el.setPointerCapture(e.pointerId)
    }
    if (d.moved) el.scrollLeft = d.startLeft - dx
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    drag.current.active = false
  }

  // Um arrasto não pode virar clique no ano em que o ponteiro foi solto.
  const swallowClickAfterDrag = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.stopPropagation()
      e.preventDefault()
      drag.current.moved = false
    }
  }

  const fadeLeft = edges.left ? 'transparent 0, #000 40px' : '#000 0'
  const fadeRight = edges.right ? '#000 calc(100% - 40px), transparent 100%' : '#000 100%'
  const maskImage = `linear-gradient(to right, ${fadeLeft}, ${fadeRight})`

  const arrowClass =
    'absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center border-[1.5px] border-[var(--ink)] bg-[var(--mat)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--on-ink)] cursor-pointer sm:flex'

  return (
    <div className="relative">
      {edges.left && (
        <button
          type="button"
          onClick={() => page(-1)}
          className={`${arrowClass} -left-3`}
          aria-label={L(lang, 'Anos anteriores', 'Earlier years', 'Années précédentes', 'Años anteriores')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {edges.right && (
        <button
          type="button"
          onClick={() => page(1)}
          className={`${arrowClass} -right-3`}
          aria-label={L(lang, 'Anos seguintes', 'Later years', 'Années suivantes', 'Años siguientes')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div
        ref={scrollerRef}
        role="list"
        onScroll={syncEdges}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={swallowClickAfterDrag}
        style={{ maskImage, WebkitMaskImage: maskImage }}
        className="relative flex select-none overflow-x-auto no-scrollbar py-1 cursor-grab active:cursor-grabbing"
      >
        {eras.map((era, i) => {
          const isSelected = selectedYear === era.year
          const allWins = era.wins > 0 && era.losses === 0
          const isFirst = i === 0
          const isLast = i === eras.length - 1

          return (
            <button
              key={era.year}
              type="button"
              role="listitem"
              data-year={era.year}
              aria-pressed={isSelected}
              onClick={() => onSelect(era)}
              className="group relative flex w-[92px] shrink-0 cursor-pointer flex-col items-center px-1 focus-visible:outline-none sm:w-[108px]"
            >
              <span
                className={`font-display text-sm font-bold tabular-nums transition-colors sm:text-base ${
                  isSelected
                    ? 'text-[var(--ink)] underline decoration-[3px] underline-offset-4'
                    : era.hasTitleFight
                      ? 'text-[var(--gold)]'
                      : 'text-[var(--muted)] group-hover:text-[var(--ink)] group-focus-visible:text-[var(--ink)]'
                }`}
              >
                {era.year}
              </span>

              <span className="relative my-1.5 flex h-4 w-full items-center justify-center">
                <span
                  className={`absolute h-px bg-[var(--rule)] ${isFirst ? 'left-1/2' : 'left-0'} ${isLast ? 'right-1/2' : 'right-0'}`}
                />
                <span
                  className={`relative rounded-sm transition-all duration-200 ${
                    isSelected
                      ? 'h-3.5 w-3.5 bg-[var(--gold-fill)] ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--mat)]'
                      : era.hasTitleFight
                        ? 'h-3 w-3 bg-[var(--gold-fill)]'
                        : allWins
                          ? 'h-2.5 w-2.5 bg-[var(--positive)]'
                          : 'h-2.5 w-2.5 bg-[var(--muted)] group-hover:bg-[var(--ink)] group-focus-visible:bg-[var(--ink)]'
                  }`}
                />
              </span>

              <span
                className={`text-label font-semibold tabular-nums transition-colors ${
                  isSelected ? 'text-[var(--ink)]' : 'text-[var(--muted)] group-hover:text-[var(--ink)]'
                }`}
              >
                {era.wins}
                {L(lang, 'V', 'W', 'V', 'V')} · {era.losses}
                {L(lang, 'D', 'L', 'D', 'D')}
              </span>

              <span className="mt-0.5 flex min-h-[26px] items-start justify-center text-center text-label font-semibold leading-tight text-[var(--gold)]">
                {era.milestone && (
                  <span className="inline-flex items-start gap-0.5">
                    {era.hasTitleFight && <Trophy className="mt-px h-2.5 w-2.5 shrink-0" />}
                    <span>{era.milestone}</span>
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
