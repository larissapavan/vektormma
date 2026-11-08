import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Share2 } from 'lucide-react'

import { L, langPath, uiLang } from '../../i18n/lang'
import type { Career } from '../../shared/game/career'
import { challengeResult, compareResults, encodeChallenge, type Challenge } from '../../shared/game/challenge'
import { challengeCode, ResultLine } from './ChallengeIntro'
import { Chip } from './ui'

/** The link that sends this run to someone: the seed, the number of fights and this result, to beat. */
export function challengeUrl(challenge: Challenge, career: Career, language: string, origin = window.location.origin) {
  return `${origin}${langPath(uiLang(language), '/career')}?d=${encodeChallenge({ seed: challenge.seed, fights: challenge.fights, target: challengeResult(career) })}`
}

/** During a challenge: which fight it is, the points so far, and what there is to beat. */
export function ChallengeBar({ challenge, career }: { challenge: Challenge; career: Career }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const fight = Math.min(career.ufcFights + 1, challenge.fights)
  return (
    <section aria-label={L(lang, 'Desafio', 'Challenge', 'Défi', 'Desafío')} className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 px-4 py-2.5" data-testid="challenge-bar">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-gold)]">
        {L(lang, 'Desafio', 'Challenge', 'Défi', 'Desafío')} #{challengeCode(challenge.seed)}
      </span>
      <Chip tone="gold">{L(lang, `Luta ${fight} de ${challenge.fights}`, `Fight ${fight} of ${challenge.fights}`, `Combat ${fight} sur ${challenge.fights}`, `Pelea ${fight} de ${challenge.fights}`)}</Chip>
      <Chip>{L(lang, `Pontos: ${career.points}`, `Points: ${career.points}`, `Points : ${career.points}`, `Puntos: ${career.points}`)}</Chip>
      {challenge.target ? <Chip tone="red">{L(lang, `Para bater: ${challenge.target.n}, ${challenge.target.p} pts`, `To beat: ${challenge.target.n}, ${challenge.target.p} pts`, `À battre : ${challenge.target.n}, ${challenge.target.p} pts`, `Para superar: ${challenge.target.n}, ${challenge.target.p} pts`)}</Chip> : null}
    </section>
  )
}

/** At the end of a challenge: the score, how it compares with the one to beat, and the link that challenges someone else on the same seed. */
export function ChallengeEnd({ challenge, career }: { challenge: Challenge; career: Career }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const result = useMemo(() => challengeResult(career), [career])
  const link = useMemo(() => challengeUrl(challenge, career, lang), [challenge, career, lang])
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const outcome = challenge.target ? compareResults(result, challenge.target) : null
  const early = career.ufcFights < challenge.fights

  const message = L(
    lang,
    `Fiz ${result.p} pontos no desafio #${challengeCode(challenge.seed)} do Vektor MMA. Consegue bater?`,
    `I scored ${result.p} points in Vektor MMA challenge #${challengeCode(challenge.seed)}. Can you beat it?`,
    `J’ai fait ${result.p} points au défi #${challengeCode(challenge.seed)} de Vektor MMA. Tu peux faire mieux ?`,
    `Hice ${result.p} puntos en el desafío #${challengeCode(challenge.seed)} de Vektor MMA. ¿Puedes superarlo?`,
  )
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setNotice(link)
    }
  }
  const share = async () => {
    try {
      await navigator.share({ text: message, url: link })
    } catch {
      // The visitor closed the share sheet, or this browser cannot share: the other buttons still work.
    }
  }
  const encoded = encodeURIComponent(link)
  const text = encodeURIComponent(message)
  const socials = [
    { name: 'X', href: `https://twitter.com/intent/tweet?text=${text}&url=${encoded}` },
    { name: 'WhatsApp', href: `https://wa.me/?text=${text}%20${encoded}` },
  ]
  const button = 'inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--rule)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-main)] transition hover:border-[var(--accent-red)]'
  const tone = outcome === 'win' ? 'border-[var(--accent-green)]/50 bg-[var(--accent-green)]/10' : outcome === 'loss' ? 'border-[var(--accent-red)]/50 bg-[var(--accent-red)]/10' : 'border-[var(--accent-gold)]/50 bg-[var(--accent-gold)]/10'

  return (
    <section aria-label={L(lang, 'Resultado do desafio', 'Challenge result', 'Résultat du défi', 'Resultado del desafío')} className={`space-y-4 rounded-2xl border p-5 text-center ${tone}`} data-testid="challenge-end">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-gold)]">
        {L(lang, 'Desafio', 'Challenge', 'Défi', 'Desafío')} #{challengeCode(challenge.seed)}
      </p>
      <p className="game-title text-5xl sm:text-6xl" data-testid="challenge-score">
        {result.p} <span className="text-lg tracking-[0.1em] text-[var(--text-secondary)]">{L(lang, 'pontos', 'points', 'points', 'puntos')}</span>
      </p>
      <p className="text-sm text-[var(--text-secondary)]">
        <ResultLine result={result} points={false} />
      </p>
      {early ? <p className="text-xs text-[var(--text-muted)]">{L(lang, `A carreira terminou na luta ${result.f} de ${challenge.fights}.`, `The career ended at fight ${result.f} of ${challenge.fights}.`, `La carrière s’est arrêtée au combat ${result.f} sur ${challenge.fights}.`, `La carrera terminó en la pelea ${result.f} de ${challenge.fights}.`)}</p> : null}

      {challenge.target && outcome ? (
        <p className="text-base font-semibold text-[var(--text-main)]" data-testid="challenge-outcome">
          {outcome === 'win'
            ? L(lang, `Você venceu o desafio de ${challenge.target.n}: ${result.p} a ${challenge.target.p}.`, `You beat ${challenge.target.n}’s challenge: ${result.p} to ${challenge.target.p}.`, `Vous avez battu le défi de ${challenge.target.n} : ${result.p} à ${challenge.target.p}.`, `Superaste el desafío de ${challenge.target.n}: ${result.p} a ${challenge.target.p}.`)
            : outcome === 'loss'
              ? L(lang, `${challenge.target.n} levou a melhor: ${challenge.target.p} a ${result.p}.`, `${challenge.target.n} came out on top: ${challenge.target.p} to ${result.p}.`, `${challenge.target.n} l’emporte : ${challenge.target.p} à ${result.p}.`, `${challenge.target.n} se llevó la mejor parte: ${challenge.target.p} a ${result.p}.`)
              : L(lang, `Empate com ${challenge.target.n}: ${result.p} pontos e ${result.w} vitórias para os dois.`, `A tie with ${challenge.target.n}: ${result.p} points and ${result.w} wins each.`, `Égalité avec ${challenge.target.n} : ${result.p} points et ${result.w} victoires chacun.`, `Empate con ${challenge.target.n}: ${result.p} puntos y ${result.w} victorias cada uno.`)}
        </p>
      ) : null}

      <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
        <p className="text-sm text-[var(--text-secondary)]">
          {L(lang, 'Mande este link: a pessoa joga o mesmo lutador, com os mesmos dados, e tenta bater o seu resultado.', 'Send this link: the person plays the same fighter, with the same dice, and tries to beat your result.', 'Envoyez ce lien : la personne joue le même combattant, avec les mêmes dés, et tente de battre votre résultat.', 'Envía este enlace: la persona juega el mismo peleador, con los mismos dados, e intenta superar tu resultado.')}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {typeof navigator !== 'undefined' && 'share' in navigator ? (
            <button type="button" onClick={share} className={button}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {L(lang, 'Compartilhar', 'Share', 'Partager', 'Compartir')}
            </button>
          ) : null}
          <button type="button" onClick={copy} className={button}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? L(lang, 'Link copiado', 'Link copied', 'Lien copié', 'Enlace copiado') : L(lang, 'Copiar link do desafio', 'Copy challenge link', 'Copier le lien du défi', 'Copiar enlace del desafío')}
          </button>
          {socials.map((social) => (
            <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" className={button}>
              {social.name}
            </a>
          ))}
        </div>
        {notice ? <p className="break-all text-xs text-[var(--text-secondary)]">{notice}</p> : null}
      </div>
    </section>
  )
}
