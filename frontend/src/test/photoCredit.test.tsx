import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '../i18n'
import { PhotoCredit } from '../shared/components/PhotoCredit'
import { photoCreditText, photoRightsText } from '../shared/hooks/usePhotoCredit'
import { respond } from './fixtures'

vi.mock('axios', () => {
  const instance = { get: async (url: string) => ({ data: respond(url) }), post: async () => ({ data: respond('/predict') }) }
  return { default: { create: () => instance }, create: () => instance }
})

function renderCredit(imageUrl: string | null) {
  return render(
    <MemoryRouter>
      <div className="relative">
        <PhotoCredit imageUrl={imageUrl} />
      </div>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await i18n.changeLanguage('en-US')
})

describe('PhotoCredit', () => {
  it('prints "Photo: ESPN" on an ESPN photo, with the rights in the tooltip', async () => {
    renderCredit('/fighter-photos/alpha-one.webp?v=abc123')
    const credit = await screen.findByText('Photo: ESPN')
    expect(credit).toHaveAttribute('title', 'Image © ESPN. All rights reserved.')
  })

  it('prints nothing on a photo that is not on the list, or when there is no photo', async () => {
    const { container } = renderCredit('/fighter-photos/someone-champion.webp')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(container.textContent).toBe('')
    expect(renderCredit(null).container.textContent).toBe('')
  })

  it('follows the language on screen', async () => {
    await i18n.changeLanguage('pt-BR')
    renderCredit('/fighter-photos/alpha-one.webp')
    expect(await screen.findByText('Foto: ESPN')).toHaveAttribute('title', 'Imagem © ESPN. Todos os direitos reservados.')
  })

  it('has the line and the rights in the four languages', () => {
    expect([photoCreditText('ESPN', 'pt-BR'), photoCreditText('ESPN', 'en-US'), photoCreditText('ESPN', 'fr-FR'), photoCreditText('ESPN', 'es-419')]).toEqual([
      'Foto: ESPN', 'Photo: ESPN', 'Photo : ESPN', 'Foto: ESPN',
    ])
    expect(photoRightsText('ESPN', 'fr-FR')).toBe('Image © ESPN. Tous droits réservés.')
    expect(photoRightsText('ESPN', 'es-419')).toBe('Imagen © ESPN. Todos los derechos reservados.')
  })
})
