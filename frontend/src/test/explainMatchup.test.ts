import { describe, expect, it } from 'vitest'

import { factorSentence, matchupSummary, trackRecordSentence } from '../shared/data/explainMatchup'
import type { MainFactor, PredictionResponse, RecentEvaluation } from '../shared/types/api'

const LANGUAGES = ['pt-BR', 'en-US', 'fr-FR', 'es-419']
const names = { a: 'Ana One', b: 'Bia Two' }
const factor = (over: Partial<MainFactor>): MainFactor => ({ feature: 'Age difference', impact: 'Ana One', explanation: 'x', magnitude: 0.1, key: 'age_diff', value_a: 28.2, value_b: 36.1, ...over })

describe('a factor in words', () => {
  it('says the number of each fighter, the favoured one first, in each language', () => {
    expect(factorSentence(factor({}), names, 'pt-BR')).toBe('Ana One tem 28 anos; Bia Two, 36.')
    expect(factorSentence(factor({}), names, 'en-US')).toBe('Ana One is 28; Bia Two is 36.')
    expect(factorSentence(factor({}), names, 'fr-FR')).toBe('Ana One a 28 ans ; Bia Two, 36.')
    expect(factorSentence(factor({}), names, 'es-419')).toBe('Ana One tiene 28 años; Bia Two, 36.')
    const strikes = factor({ key: 'sig_per_min_diff', feature: 'Strikes landed per minute gap', impact: 'Bia Two', value_a: 2.51, value_b: 5.2 })
    expect(factorSentence(strikes, names, 'pt-BR')).toBe('Bia Two acerta 5,2 golpes por minuto; Ana One, 2,5.')
  })

  it('says so when the number alone points to the other fighter', () => {
    expect(factorSentence(factor({ impact: 'Bia Two' }), names, 'en-US')).toBe('Bia Two is 36; Ana One is 28. On its own this would point to Ana One; the model reads it with the rest.')
    expect(factorSentence(factor({ key: 'reach_diff', value_a: 190, value_b: 180 }), names, 'en-US')).not.toContain('On its own')
  })

  it('shows one more decimal when the two would read the same', () => {
    expect(factorSentence(factor({ value_a: 28.2, value_b: 28.4 }), names, 'en-US')).toBe('Ana One is 28.2; Bia Two is 28.4.')
    expect(factorSentence(factor({ key: 'ko_losses_diff', feature: 'Knockout losses difference', value_a: 1, value_b: 1 }), names, 'pt-BR')).toContain('é igual para os dois')
  })

  it('does not make up a number the model did not have', () => {
    expect(factorSentence(factor({ value_b: null }), names, 'pt-BR')).toBe('Não há esse número de Bia Two: o modelo usou um valor típico.')
    expect(factorSentence(factor({ value_a: null, value_b: null }), names, 'en-US')).toBe('There is no such number for Ana One or Bia Two: the model used a typical value.')
  })

  it('tells the UFC results with the record and the rating, and a fighter with none as having none', () => {
    const results = factor({
      key: 'ufc_results', feature: 'UFC results and level of opposition', value_a: undefined, value_b: undefined,
      results_a: { fights: 18, wins: 17, losses: 1, streak: 16, elo: 1712 }, results_b: { fights: 0, wins: 0, losses: 0, streak: 0, elo: 1500 },
    })
    expect(factorSentence(results, names, 'en-US').replaceAll('⁠', '')).toBe('Ana One is 17-1 in the UFC with an Elo of 1712; Bia Two has no UFC fight (starting Elo, 1500). Elo rises more for beating strong opponents.')
    expect(factorSentence({ ...results, impact: 'Bia Two' }, names, 'pt-BR')).toContain('Sozinho, isso apontaria para Ana One')
  })

  it('reads a time without fighting in days, months or years', () => {
    const off = (a: number, b: number) => factorSentence(factor({ key: 'days_off_diff', value_a: a, value_b: b }), names, 'pt-BR')
    expect(off(45, 240)).toBe('Ana One está há 45 dias sem lutar; Bia Two, há 8 meses.')
    expect(off(240, 913)).toBe('Ana One está há 8 meses sem lutar; Bia Two, há 2,5 anos.')
  })

  it('says what a factor about the fight itself is, and falls back when the API sends no key', () => {
    expect(factorSentence(factor({ key: 'weight_lbs', feature: 'Weight class', value_a: null, value_b: null }), names, 'en-US')).toContain('the same for both fighters')
    expect(factorSentence(factor({ key: undefined }), names, 'pt-BR')).toBe('Diferença de idade pesou a favor de Ana One.')
  })

  it('has every number the model uses, in every language, with no English left over', () => {
    const keys = ['age', 'height', 'reach', 'days_off', 'finish_rate', 'ko_losses', 'sig_acc', 'sig_def', 'sig_per_min', 'sig_absorbed_per_min', 'td_acc', 'td_def', 'td_per_15', 'kd_per_15', 'control_share', 'sub_per_15']
    for (const key of keys) {
      const said = LANGUAGES.map((lang) => factorSentence(factor({ key: `${key}_diff`, value_a: 0.61, value_b: 0.52 }), names, lang))
      expect(new Set(said).size, key).toBe(4)
      for (const text of said) expect(text, key).toMatch(/Ana One.*Bia Two/)
    }
  })
})

const evaluation = { calibration: [{ label: '55%-60%', fights: 429, average_confidence: 0.57, accuracy: 0.618 }, { label: '90%-100%', fights: 3, average_confidence: 0.92, accuracy: 1 }] } as RecentEvaluation

describe('how often picks like this one were right', () => {
  it('comes from the band the probability falls in, and only when the band has enough fights', () => {
    expect(trackRecordSentence(0.58, evaluation, 'pt-BR')).toBe('No teste com lutas passadas, palpites de 55–60% acertaram cerca de 6 em cada 10 (429 lutas).')
    expect(trackRecordSentence(0.6, evaluation, 'pt-BR')).toBeNull()
    expect(trackRecordSentence(0.93, evaluation, 'pt-BR')).toBeNull()
    expect(trackRecordSentence(0.58, null, 'pt-BR')).toBeNull()
  })
})

describe('the summary', () => {
  const prediction = {
    predicted_winner: 'Ana One', probability: 0.58, fighter_a_probability: 0.58, fighter_b_probability: 0.42, message: '',
    fighter_a_profile: { name: 'Ana One' }, fighter_b_profile: { name: 'Bia Two' },
    main_factors: [factor({ key: 'reach_diff', feature: 'Reach difference', impact: 'Bia Two', value_a: 180, value_b: 190 }), factor({})],
  } as unknown as PredictionResponse

  it('gives the heaviest reason on each side, the favourite first, and the test record', () => {
    expect(matchupSummary(prediction, evaluation, 'pt-BR')).toEqual([
      'O que mais pesa a favor de Ana One: diferença de idade. Ana One tem 28 anos; Bia Two, 36.',
      'Do lado de Bia Two: diferença de envergadura. Bia Two tem 190 cm de envergadura; Ana One, 180 cm.',
      'No teste com lutas passadas, palpites de 55–60% acertaram cerca de 6 em cada 10 (429 lutas).',
    ])
  })

  it('has nothing to explain when the model cannot tell the two apart', () => {
    expect(matchupSummary({ ...prediction, probability: 0.5 }, evaluation, 'en-US')).toEqual([])
  })

  it('leaves the test record out when a fighter comes from another organization', () => {
    const outside = { ...prediction, fighter_b_profile: { name: 'Bia Two', data_origin: 'pfl' } } as unknown as PredictionResponse
    expect(matchupSummary(outside, evaluation, 'en-US')).toHaveLength(2)
  })
})
