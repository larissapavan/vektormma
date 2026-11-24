import { describe, expect, it } from 'vitest'

import { translateReason } from '../shared/data/confidenceText'

// The sentences backend/app/services/data_confidence.py writes; tests/backend/test_data_confidence.py checks that each one
// still has a pattern here.
const LAYOFF = 'Ana Lima last fought in the UFC about 2 years ago, so their numbers may not show how they fight today.'
const NO_STATS = 'Ana Lima has no striking or takedown numbers for fights outside the UFC; where they are missing, the model uses typical values.'
const NO_REACH = 'Ana Lima has no reach on record, so the model used a typical value.'
const NO_AGE_OR_REACH = 'Ana Lima has no age or reach on record, so the model used typical values.'

describe('data confidence sentences', () => {
  it.each([
    [LAYOFF, 'pt-BR', 'Ana Lima lutou no UFC pela última vez há cerca de 2 anos; os números podem não mostrar o nível atual.'],
    [LAYOFF, 'fr-FR', 'Ana Lima a combattu à l’UFC pour la dernière fois il y a environ 2 ans ; ses chiffres ne reflètent peut-être plus son niveau actuel.'],
    [LAYOFF, 'es-419', 'Ana Lima peleó en la UFC por última vez hace cerca de 2 años; es posible que sus números ya no reflejen su nivel actual.'],
    [NO_STATS, 'pt-BR', 'Ana Lima não tem números de golpes nem de quedas das lutas fora do UFC; onde faltam, o modelo usa valores típicos.'],
    [NO_STATS, 'fr-FR', 'Ana Lima n’a pas de chiffres de frappe ni de takedown pour ses combats hors de l’UFC ; là où ils manquent, le modèle utilise des valeurs typiques.'],
    [NO_STATS, 'es-419', 'Ana Lima no tiene números de golpes ni de derribos de sus peleas fuera de la UFC; donde faltan, el modelo usa valores típicos.'],
    [NO_REACH, 'pt-BR', 'Ana Lima não tem envergadura registrada, então o modelo usou um valor típico.'],
    [NO_REACH, 'fr-FR', 'Données manquantes pour Ana Lima (allonge) : le modèle a utilisé une valeur typique.'],
    [NO_REACH, 'es-419', 'Faltan datos de Ana Lima (alcance): el modelo usó un valor típico.'],
    [NO_AGE_OR_REACH, 'pt-BR', 'Ana Lima não tem idade nem envergadura registradas, então o modelo usou valores típicos.'],
    [NO_AGE_OR_REACH, 'fr-FR', 'Données manquantes pour Ana Lima (âge, allonge) : le modèle a utilisé des valeurs typiques.'],
    [NO_AGE_OR_REACH, 'es-419', 'Faltan datos de Ana Lima (edad, alcance): el modelo usó valores típicos.'],
  ])('%s in %s', (reason, language, expected) => {
    expect(translateReason(reason, language)).toBe(expected)
  })

  it('leaves the English sentence as the API wrote it', () => {
    for (const reason of [LAYOFF, NO_STATS, NO_REACH, NO_AGE_OR_REACH]) expect(translateReason(reason, 'en-US')).toBe(reason)
  })

  it('shows the current sentence for the earlier wording, in every language', () => {
    const earlier: [string, string][] = [
      ['Ana Lima last fought in the UFC about 2 years ago; the model sees no sign of ring rust.', LAYOFF],
      ['Ana Lima has no striking or takedown numbers on file outside the UFC, so the model used averages for them.', NO_STATS],
      ['Ana Lima has no reach on record, so the model filled it in with an average.', NO_REACH],
      ['Ana Lima has no age or reach on record, so the model filled it in with an average.', NO_AGE_OR_REACH],
    ]
    for (const language of ['pt-BR', 'en-US', 'fr-FR', 'es-419'])
      for (const [before, now] of earlier) expect(translateReason(before, language), language).toBe(translateReason(now, language))
  })
})
