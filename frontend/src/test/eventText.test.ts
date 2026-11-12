import { describe, expect, it } from 'vitest'

import { eventPreview, eventRecap, headliner, type CardFight } from '../shared/data/eventText'

const card: CardFight[] = [
  { a: 'Main Red', b: 'Main Blue', weightClass: 'Heavyweight', title: true, pick: { winner: 'Main Red', probability: 0.56 } },
  { a: 'Sure Thing', b: 'Long Shot', weightClass: 'Lightweight', pick: { winner: 'Sure Thing', probability: 0.71 } },
  { a: 'Coin Flip', b: 'Other Side', weightClass: 'Flyweight', pick: { winner: 'Other Side', probability: 0.51 } },
]

describe('written read of a card', () => {
  it('previews an announced card: count, main event, firmest and closest pick', () => {
    const pt = eventPreview('pt-BR', 'UFC 999: Red vs. Blue', card).join(' ')
    expect(pt).toContain('3 lutas anunciadas, 1 valendo cinturão.')
    expect(pt).toContain('A luta principal é Main Red vs. Main Blue (Peso Pesado); o modelo dá 56% de chance a Main Red.')
    expect(pt).toContain('O palpite mais firme do card é Sure Thing contra Long Shot, com 71%.')
    expect(pt).toContain('Coin Flip vs. Other Side: 51% para Other Side.')
    expect(eventPreview('en-US', 'UFC 999', card).join(' ')).toContain('The main event is Main Red vs. Main Blue')
    expect(eventPreview('pt-BR', 'X', [])).toEqual([])
  })

  it('recaps a card that happened: methods, the main event and how the picks did', () => {
    const done: CardFight[] = [
      { ...card[0], winner: 'Main Blue', method: 'KO/TKO', round: 2 },
      { ...card[1], winner: 'Sure Thing', method: 'U-DEC', round: 3 },
      { ...card[2], winner: 'Other Side', method: 'SUB', round: 1 },
    ]
    const es = eventRecap('es-419', 'UFC 999: Red vs. Blue', done).join(' ')
    expect(es).toContain('3 peleas tuvieron ganador: 1 por nocaut, 1 por sumisión y 1 por decisión.')
    expect(es).toContain('En la pelea estelar, Main Blue venció a Main Red (Nocaut (KO/TKO), round 2).')
    expect(es).toContain('El modelo acertó 2 de 3 pronósticos en esta cartelera.')
    expect(es).toContain('La mayor sorpresa para el modelo fue que Main Blue venciera a Main Red, que tenía 56% de probabilidad.')
    expect(eventRecap('fr-FR', 'X', card)).toEqual([])
  })

  it('finds the main event from the name of the card, whatever the order of the list', () => {
    const fights = [card[1], card[0]]
    expect(headliner('UFC Fight Night: Red vs. Blue', fights, false)).toBe(card[0])
    expect(headliner('UFC 999', fights, true)).toBe(card[1])
    expect(headliner('UFC 999', fights, false)).toBeUndefined()
  })
})
