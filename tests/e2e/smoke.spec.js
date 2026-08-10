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

  await page.goto('/#/studio')
  await expect(page.getByRole('heading', { name: 'Meus agentes' })).toBeVisible()

  await page.goto('/#/studio/new')
  await expect(page.getByRole('navigation', { name: /Etapas/ })).toBeVisible()

  // Walk all eight steps so every step module actually executes.
  for (const label of [
    'Objetivo',
    'Soul',
    'Personalidade',
    'Guard Rails',
    'Ferramentas',
    'Memória',
    'Exportar',
  ]) {
    const stepButton = page.getByRole('button', { name: new RegExp(`Etapa \\d+: ${label}\\.`) })
    await stepButton.click()
    await expect(stepButton).toHaveAttribute('aria-current', 'step')
  }

  expect(problems).toEqual([])
})
