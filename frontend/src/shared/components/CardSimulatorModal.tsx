import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Swords, Bot, User, Share2, Check, RotateCcw, X } from 'lucide-react'
import { L } from '../../i18n/lang'
import { getDivisionName } from '../data/divisions'
import type { EventSummary, UpcomingPick } from '../types/api'

interface CardSimulatorModalProps {
  event: EventSummary
  pickFor?: (event: string, fighterA: string, fighterB: string) => UpcomingPick | undefined
  onClose: () => void
  onOpenFighter?: (name: string) => void
}

export function CardSimulatorModal({ event, pickFor, onClose }: CardSimulatorModalProps) {
  const { i18n } = useTranslation()

  const storageKey = `ufc_simulator_picks_${event.name}`
  const [userPicks, setUserPicks] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [copied, setCopied] = useState(false)

  const handlePick = (fightId: string, winner: string) => {
    setUserPicks((prev) => {
      const updated = { ...prev, [fightId]: winner }
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      } catch { /* ignore storage error */ }
      return updated
    })
  }

  const handleClear = () => {
    setUserPicks({})
    try {
      localStorage.removeItem(storageKey)
    } catch { /* ignore storage error */ }
  }

  // Calculate statistics
  const fights = useMemo(() => event.fights ?? [], [event.fights])
  const stats = useMemo(() => {
    let totalPicked = 0
    let agreedWithAi = 0
    let totalWithAi = 0

    fights.forEach((fight, idx) => {
      const fightId = fight.fight_url ?? `${fight.fighter_1}_${fight.fighter_2}_${idx}`
      const userChoice = userPicks[fightId]
      const aiPick = pickFor?.(event.name, fight.fighter_1, fight.fighter_2)

      if (userChoice) {
        totalPicked++
        if (aiPick) {
          totalWithAi++
          if (aiPick.predicted_winner.toLowerCase() === userChoice.toLowerCase()) {
            agreedWithAi++
          }
        }
      }
    })

    const agreementPct = totalWithAi > 0 ? Math.round((agreedWithAi / totalWithAi) * 100) : 0
    return { totalPicked, agreedWithAi, totalWithAi, agreementPct }
  }, [fights, userPicks, pickFor, event.name])

  const handleShare = () => {
    let text = L(
      i18n.language,
      `🥊 MEUS palpites VS IA • ${event.name}\n`,
      `🥊 MY PICKS VS AI • ${event.name}\n`,
      `🥊 MES pronostics contre L’IA • ${event.name}\n`,
      `🥊 MIS PRONÓSTICOS VS. LA IA • ${event.name}\n`,
    )
    
    if (event.date) {
      text += `📅 ${event.date}\n\n`
    } else {
      text += '\n'
    }

    fights.forEach((fight, idx) => {
      const fightId = fight.fight_url ?? `${fight.fighter_1}_${fight.fighter_2}_${idx}`
      const userChoice = userPicks[fightId]
      const aiPick = pickFor?.(event.name, fight.fighter_1, fight.fighter_2)

      if (userChoice) {
        const matchesAi = aiPick && aiPick.predicted_winner.toLowerCase() === userChoice.toLowerCase()
        const aiInfo = aiPick ? `🤖 IA: ${aiPick.predicted_winner} (${Math.round(aiPick.probability * 100)}%)` : ''
        const verdict = matchesAi
          ? L(i18n.language, '🤝 [CONCORDO]', '🤝 [AGREE]', '🤝 [D’ACCORD]', '🤝 [COINCIDO]')
          : L(i18n.language, '[Zebra/divergência]', '[Upset/disagree]', '[Surprise/désaccord]', '[Sorpresa/desacuerdo]')
        text += `• ${fight.fighter_1} vs ${fight.fighter_2}\n  👉 ${L(i18n.language, 'Meu palpite', 'My pick', 'Mon pronostic', 'Mi pronóstico')}: ${userChoice} | ${aiInfo} ${verdict}\n\n`
      }
    })

    if (stats.totalWithAi > 0) {
      text += L(
        i18n.language,
        `📊 Concordância com o Modelo de IA: ${stats.agreementPct}% (${stats.agreedWithAi}/${stats.totalWithAi} lutas)\n`,
        `📊 Agreement with AI Model: ${stats.agreementPct}% (${stats.agreedWithAi}/${stats.totalWithAi} fights)\n`,
        `📊 Accord avec le modèle d’IA : ${stats.agreementPct} % (${stats.agreedWithAi}/${stats.totalWithAi} combats)\n`,
        `📊 Coincidencia con el modelo de IA: ${stats.agreementPct} % (${stats.agreedWithAi}/${stats.totalWithAi} peleas)\n`,
      )
    }
    text += L(i18n.language, `Faça seus palpites no site: https://www.vektormma.com/`, `Make your picks at: https://www.vektormma.com/`, `Faites vos pronostics sur le site : https://www.vektormma.com/`, 'Haz tus pronósticos en: https://www.vektormma.com/')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2.5 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="surface-card flex max-h-[92vh] h-[min(90vh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-sm border border-[var(--line-soft)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-sm bg-[var(--panel)] p-2 text-[var(--ink)]">
              <Swords className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-main)] sm:text-lg">
                {L(i18n.language, 'Seus palpites contra os do modelo', 'Your picks against the model’s', 'Vos pronostics face à ceux du modèle', 'Tus pronósticos contra los del modelo')}
              </h2>
              <p className="theme-muted truncate text-xs">{event.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ghost-action grid h-9 w-9 place-items-center rounded-sm text-[var(--text-muted)] hover:text-[var(--text-main)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Score & Agreement Banner */}
        <div className="border-b border-[var(--line-soft)] bg-[var(--surface-3)] px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-xs text-[var(--text-muted)]">{L(i18n.language, 'Palpites definidos', 'Picks made', 'Pronostics faits', 'Pronósticos hechos')}: </span>
                <span className="font-bold text-[var(--text-main)]">{stats.totalPicked} / {fights.length}</span>
              </div>
              <div className="h-3 w-px bg-[var(--line-soft)]" />
              <div>
                <span className="text-xs text-[var(--text-muted)]">{L(i18n.language, 'Iguais aos do modelo', 'Same as the model', 'Comme le modèle', 'Iguales al modelo')}: </span>
                <span className="font-bold text-[var(--gold)]">{stats.agreementPct}%</span>
                <span className="text-xs text-[var(--text-muted)]"> ({stats.agreedWithAi}/{stats.totalWithAi})</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {stats.totalPicked > 0 ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text-main)]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {L(i18n.language, 'Limpar', 'Reset', 'Réinitialiser', 'Reiniciar')}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleShare}
                disabled={stats.totalPicked === 0}
                className="inline-flex items-center gap-1.5 rounded-sm bg-[var(--ink)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--ink)] disabled:opacity-40"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied ? L(i18n.language, 'Copiado', 'Copied', 'Copié', 'Copiado') : L(i18n.language, 'Compartilhar', 'Share', 'Partager', 'Compartir')}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-sm bg-[var(--line-soft)]">
            <div
              className="h-full bg-[var(--ink)] transition-all duration-300"
              style={{ width: `${(stats.totalPicked / (fights.length || 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Fights list */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {fights.map((fight, idx) => {
            const fightId = fight.fight_url ?? `${fight.fighter_1}_${fight.fighter_2}_${idx}`
            const userChoice = userPicks[fightId]
            const aiPick = pickFor?.(event.name, fight.fighter_1, fight.fighter_2)
            const isF1User = userChoice?.toLowerCase() === fight.fighter_1.toLowerCase()
            const isF2User = userChoice?.toLowerCase() === fight.fighter_2.toLowerCase()
            const isF1Ai = aiPick?.predicted_winner.toLowerCase() === fight.fighter_1.toLowerCase()
            const isF2Ai = aiPick?.predicted_winner.toLowerCase() === fight.fighter_2.toLowerCase()

            return (
              <div
                key={fightId}
                className="rounded-sm border border-[var(--line-soft)] bg-[var(--tile-bg)] p-3 transition hover:border-[var(--rule)]"
              >
                {/* Weight class / Division */}
                <div className="mb-2 flex items-center justify-between text-label text-[var(--text-muted)]">
                  <span className="font-semibold">
                    {fight.weight_class ? getDivisionName(fight.weight_class, i18n.language) : L(i18n.language, 'Combate', 'Bout', 'Combat', 'Pelea')}
                  </span>
                  {aiPick ? (
                    <span className="inline-flex items-center gap-1 rounded-sm border border-[var(--line-soft)] bg-[var(--surface-3)] px-2 py-0.5 text-label text-[var(--text-main)]">
                      <Bot className="h-3 w-3 text-[var(--ink)]" />
                      IA: <span className="font-bold text-[var(--gold)]">{aiPick.predicted_winner}</span> ({Math.round(aiPick.probability * 100)}%)
                    </span>
                  ) : null}
                </div>

                {/* Fighters Choice Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Fighter 1 Button */}
                  <button
                    type="button"
                    onClick={() => handlePick(fightId, fight.fighter_1)}
                    className={`flex flex-col items-center justify-center rounded-sm border p-2.5 text-center transition ${
                      isF1User
                        ? 'border-[var(--red)] bg-[var(--red)] text-white'
                        : 'border-[var(--line-soft)] bg-[var(--surface-3)] text-[var(--text-muted)] hover:border-[var(--rule)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isF1User ? <User className="h-3.5 w-3.5 text-white" /> : null}
                      <span className="text-sm font-bold">{fight.fighter_1}</span>
                    </div>
                    {isF1Ai ? (
                      <span className="mt-1 text-label text-[var(--gold)] font-medium">
                        {L(i18n.language, 'Palpite do modelo', 'Model’s pick', 'Pronostic du modèle', 'Pronóstico del modelo')}
                      </span>
                    ) : null}
                  </button>

                  {/* Fighter 2 Button */}
                  <button
                    type="button"
                    onClick={() => handlePick(fightId, fight.fighter_2)}
                    className={`flex flex-col items-center justify-center rounded-sm border p-2.5 text-center transition ${
                      isF2User
                        ? 'border-[var(--blue)] bg-[var(--blue)] text-white'
                        : 'border-[var(--line-soft)] bg-[var(--surface-3)] text-[var(--text-muted)] hover:border-[var(--rule)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isF2User ? <User className="h-3.5 w-3.5 text-white" /> : null}
                      <span className="text-sm font-bold">{fight.fighter_2}</span>
                    </div>
                    {isF2Ai ? (
                      <span className="mt-1 text-label text-[var(--gold)] font-medium">
                        {L(i18n.language, 'Palpite do modelo', 'Model’s pick', 'Pronostic du modèle', 'Pronóstico del modelo')}
                      </span>
                    ) : null}
                  </button>
                </div>

                {/* Feedback line */}
                {userChoice && aiPick ? (
                  <div className="mt-2 text-center text-label">
                    {userChoice.toLowerCase() === aiPick.predicted_winner.toLowerCase() ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <Check className="h-3 w-3" /> {L(i18n.language, 'Você e o modelo escolheram o mesmo vencedor', 'You and the model picked the same winner', 'Vous et le modèle avez choisi le même vainqueur', 'Tú y el modelo eligieron al mismo ganador')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                        {L(i18n.language, 'Você foi contra o modelo e apostou na zebra', 'You went against the model and picked the underdog', 'Vous avez contredit le modèle en misant sur l’outsider', 'Fuiste contra el modelo y elegiste al no favorito')}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
