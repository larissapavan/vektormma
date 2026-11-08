import { Handshake, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { L, pick } from '../../i18n/lang'
import { DEALS, FIX_CAUGHT_CHANCE, FIX_REWARD, type Card } from '../../shared/game/events'
import { DEAL_TEXT } from '../../shared/game/eventsText'
import { Chip, GhostButton, PrimaryButton, useFocusOnMount } from './ui'

/**
 * A card that turns up between the camp and the matchmaking: a sponsor's offer, or an arranged fight. The player answers before
 * the fights are shown. The arranged fight is written as what it is (cheating, against the rules, and risky), and the safe answer
 * is the first button.
 */
export function CardStep({ card, onAnswer }: { card: Card; onAnswer: (accepted: boolean) => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const heading = useFocusOnMount<HTMLHeadingElement>()

  if (card.kind === 'sponsor') {
    const deal = DEALS[card.deal]
    const text = DEAL_TEXT[card.deal]
    return (
      <section className="surface-card rounded-2xl space-y-5 p-4 sm:p-7" aria-labelledby="card-title">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-gold)]">{L(lang, 'Proposta de patrocínio', 'Sponsorship offer', 'Offre de parrainage', 'Oferta de patrocinio')}</p>
          <h2 id="card-title" ref={heading} tabIndex={-1} className="game-title mt-1 text-xl focus:outline-none sm:text-3xl">
            <Handshake className="mr-2 inline h-6 w-6 align-[-3px] text-[var(--text-gold)]" aria-hidden="true" />
            {text.sponsor}
          </h2>
        </div>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {L(lang, 'Uma marca quer o seu nome na bermuda. O contrato vale só para a próxima luta: ', 'A brand wants your name on the shorts. The contract covers only the next fight: ', 'Une marque veut votre nom sur le short. Le contrat ne vaut que pour le prochain combat : ', 'Una marca quiere tu nombre en el short. El contrato vale solo para la próxima pelea: ')}
          <strong className="text-[var(--text-main)]">{pick(lang, text.ask)}</strong>
        </p>
        <ul className="flex flex-wrap gap-2">
          <li>
            <Chip tone="green">{L(lang, `Cumpriu: +${deal.reward} pontos`, `Met: +${deal.reward} points`, `Rempli : +${deal.reward} points`, `Cumplido: +${deal.reward} puntos`)}</Chip>
          </li>
          <li>
            <Chip tone="red">{L(lang, `Não cumpriu: −${deal.penalty} ${deal.penalty === 1 ? 'ponto' : 'pontos'}`, `Missed: −${deal.penalty} ${deal.penalty === 1 ? 'point' : 'points'}`, `Manqué : −${deal.penalty} ${deal.penalty === 1 ? 'point' : 'points'}`, `Incumplido: −${deal.penalty} ${deal.penalty === 1 ? 'punto' : 'puntos'}`)}</Chip>
          </li>
        </ul>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton onClick={() => onAnswer(true)}>{L(lang, 'Aceitar o contrato', 'Accept the contract', 'Accepter le contrat', 'Aceptar el contrato')}</PrimaryButton>
          <GhostButton onClick={() => onAnswer(false)}>{L(lang, 'Recusar', 'Decline', 'Refuser', 'Rechazar')}</GhostButton>
        </div>
      </section>
    )
  }

  const caught = Math.round(FIX_CAUGHT_CHANCE * 100)
  return (
    <section className="surface-card rounded-2xl space-y-5 border-[var(--accent-red)]/40 p-4 sm:p-7" aria-labelledby="card-title">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-red)]">{L(lang, 'Proposta ilegal', 'Illegal offer', 'Offre illégale', 'Oferta ilegal')}</p>
        <h2 id="card-title" ref={heading} tabIndex={-1} className="game-title mt-1 text-xl focus:outline-none sm:text-3xl">
          <ShieldAlert className="mr-2 inline h-6 w-6 align-[-3px] text-[var(--text-red)]" aria-hidden="true" />
          {L(lang, 'Um empresário quer combinar uma luta', 'A manager wants to fix a fight', 'Un agent veut truquer un combat', 'Un representante quiere arreglar una pelea')}
        </h2>
      </div>
      <p className="text-sm leading-6 text-[var(--text-secondary)]">
        {L(
          lang,
          'Ele pede que você perca a próxima luta de propósito e promete mexer os pauzinhos para subir você no ranking. Combinar resultado é crime e trai o esporte, os fãs e o adversário: aqui, serve para mostrar o que isso custa.',
          'He asks you to lose the next fight on purpose and promises to pull strings to move you up the ranking. Fixing a result is a crime and a betrayal of the sport, the fans and your opponent: here, it is a way to show what it costs.',
          'Il vous demande de perdre le prochain combat exprès et promet d’user de son influence pour vous faire monter au classement. Truquer un résultat est un délit et une trahison envers le sport, les fans et l’adversaire : ici, cela sert à montrer ce que cela coûte.',
          'Te pide que pierdas la próxima pelea a propósito y promete mover influencias para subirte en el ranking. Arreglar un resultado es un delito y una traición al deporte, a los aficionados y al rival: aquí sirve para mostrar lo que cuesta.',
        )}
      </p>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Chip tone="gold">{L(lang, `Se der certo: +${FIX_REWARD} pontos`, `If it works: +${FIX_REWARD} points`, `Si ça marche : +${FIX_REWARD} points`, `Si sale bien: +${FIX_REWARD} puntos`)}</Chip>
        </li>
        <li>
          <Chip tone="red">{L(lang, 'A derrota entra no seu cartel', 'The loss goes on your record', 'La défaite compte dans votre bilan', 'La derrota entra en tu récord')}</Chip>
        </li>
        <li>
          <Chip tone="red">{L(lang, `${caught}% de chance de ser descoberto e banido para sempre`, `${caught}% chance of being found out and banned for life`, `${caught} % de risque d’être démasqué et banni à vie`, `${caught} % de probabilidad de ser descubierto y vetado de por vida`)}</Chip>
        </li>
      </ul>
      <div className="flex flex-wrap gap-3">
        <PrimaryButton onClick={() => onAnswer(false)}>{L(lang, 'Recusar', 'Refuse', 'Refuser', 'Rechazar')}</PrimaryButton>
        <GhostButton onClick={() => onAnswer(true)}>{L(lang, 'Aceitar e perder de propósito', 'Accept and lose on purpose', 'Accepter et perdre exprès', 'Aceptar y perder a propósito')}</GhostButton>
      </div>
    </section>
  )
}
