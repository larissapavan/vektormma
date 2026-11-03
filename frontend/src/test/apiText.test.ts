import { describe, expect, it } from 'vitest'

import { baselineName, localizeApiText } from '../shared/data/apiText'
import { localizeFeature } from '../shared/utils/localizeFeature'

const LANGUAGES = ['pt-BR', 'fr-FR', 'es-419'] as const

describe('pre-fight model texts', () => {
  // That every sentence in backend/app/utils/constants.py has these entries is checked on the backend side
  // (tests/backend/test_prefight_service.py), which can read both files.
  it.each(LANGUAGES)('translates a highlight and a limitation into %s', (language) => {
    for (const sentence of [
      'Every probability is the average of both fighter orders, so it does not change with who is listed first.',
      'Fights are hard to call: a pick is an estimate, and upsets are common.',
    ]) {
      const translated = localizeApiText(sentence, language)
      expect(translated, sentence).not.toBe(sentence)
      expect(translated.length).toBeGreaterThan(20)
    }
  })

  it('keeps the note with its numbers in each language', () => {
    const note =
      'Measured once on 1,755 fights (June 2023 to October 2026), all later than the fights it trained on, each fighter described as of the morning of the fight. ' +
      'It picked the winner 62.7% of the time; its confidence was calibrated on a separate block of earlier fights.'
    expect(localizeApiText(note, 'en-US')).toBe(note)
    expect(localizeApiText(note, 'pt-BR')).toContain('1.755 lutas')
    expect(localizeApiText(note, 'pt-BR')).toContain('62,7%')
    expect(localizeApiText(note, 'fr-FR')).toContain('62,7 %')
    expect(localizeApiText(note, 'es-419')).toContain(`${(62.7).toLocaleString('es-419', { minimumFractionDigits: 1 })} %`)
    for (const language of LANGUAGES) expect(localizeApiText(note, language)).not.toMatch(/\bfights\b|\bmorning\b/)
  })

  it('translates the note about the pre-fight model replacing the earlier one, with its count and day', () => {
    const note =
      '12 of these picks were saved by the pre-fight model, in use since 2026-11-10. Earlier picks came from the model it replaced and are kept exactly as they were shown. ' +
      'The record of each model is counted separately below.'
    expect(localizeApiText(note, 'en-US')).toBe(note)
    expect(localizeApiText(note, 'pt-BR')).toContain('12 destes palpites foram salvos pelo modelo pré-luta')
    expect(localizeApiText(note, 'fr-FR')).toContain('12 de ces pronostics ont été enregistrés par le modèle pré-combat')
    expect(localizeApiText(note, 'es-419')).toContain('12 de estos pronósticos los guardó el modelo previo a la pelea')
    for (const language of LANGUAGES) {
      for (const english of ['picks', 'saved', ' model ']) expect(localizeApiText(note, language), language).not.toContain(english)
      expect(localizeApiText(note, language), language).toMatch(/2026|nov/i)
    }
  })

  it('names the new baselines in each language', () => {
    expect(baselineName('dummy_prior', 'en-US')).toBe('always 50/50')
    expect(baselineName('dummy_prior', 'pt-BR')).toBe('sempre 50/50')
    expect(localizeApiText('Always 50/50', 'fr-FR')).toBe('Toujours 50/50')
  })
})

describe('feature names of the pre-fight model', () => {
  const labels = [
    'Rating (Elo) difference', 'UFC fights difference', 'UFC wins difference', 'UFC losses difference', 'Win streak difference',
    'Time off difference', 'Finish rate difference', 'Knockout losses difference', 'Recent form difference', 'Striking defense gap',
    'Strikes landed per minute gap', 'Strikes absorbed per minute gap', 'Takedown defense gap', 'Takedowns per 15 minutes gap',
    'Knockdowns per 15 minutes gap', 'Control time gap', 'Submission attempts per 15 minutes gap', 'Scheduled rounds', 'Title fight',
    'Weight class', "Women's division", 'Combined age', 'Combined UFC experience',
  ]

  it.each(LANGUAGES)('has every label in %s', (language) => {
    for (const label of labels) expect(localizeFeature(label, language), label).not.toBe(label)
  })

  it('leaves English as it is', () => {
    for (const label of labels) expect(localizeFeature(label, 'en-US')).toBe(label)
  })
})
