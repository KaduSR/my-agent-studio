import { expect, test } from '@playwright/test'

/**
 * Catches the failure mode that unit tests cannot: a module that throws on
 * load, a broken import path, or an icon name that does not exist. Any console
 * error at all fails this test.
 */
test('every route loads with no console errors', async ({ page }) => {
  /** @type {string[]} */
  const problems = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text())
  })
  page.on('pageerror', (error) => problems.push(String(error)))

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'My Agent Studio' })).toBeVisible()
  await expect(page).toHaveTitle('Agent Studio')

  await page.goto('/#/studio')
  await expect(page.getByRole('heading', { name: 'Meus agentes' })).toBeVisible()

  await page.goto('/#/studio/new')
  await expect(page.getByRole('navigation', { name: /Etapas/ })).toBeVisible()

  // The title used to be rebuilt per route, with an em dash joining the crumb to
  // the product name. It is fixed now, so it must not drift as routes change.
  await expect(page).toHaveTitle('Agent Studio')

  // Walk every step so each step module actually executes.
  for (const label of [
    'Objetivo',
    'Soul',
    'Personalidade',
    'Guard Rails',
    'Ferramentas',
    'Conhecimento',
    'Memória',
    'Exportar',
  ]) {
    const stepButton = page.getByRole('button', { name: new RegExp(`Etapa \\d+: ${label}\\.`) })
    await stepButton.click()
    await expect(stepButton).toHaveAttribute('aria-current', 'step')
  }

  // The team routes come after the builder walk, not in the middle of it: the
  // loop above needs the builder still on screen.
  await page.goto('/#/times')
  await expect(page.getByRole('heading', { name: 'Times de agentes' })).toBeVisible()

  await page.goto('/#/times/new')
  await expect(page.getByLabel('Nome do time')).toBeVisible()

  await page.goto('/#/times/nao-existe')
  await expect(page.getByText('Time não encontrado')).toBeVisible()

  await expect(page).toHaveTitle('Agent Studio')
  expect(problems).toEqual([])
})
