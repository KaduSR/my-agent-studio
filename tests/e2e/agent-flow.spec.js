import { expect, test } from '@playwright/test'

/*
 * Each test gets a fresh browser context, so localStorage starts empty and
 * `/studio/new` opens a blank agent. Templates are the only pre-filled path.
 */

/**
 * The rail states each step outright ("Etapa 5: Guard Rails. ..."), which is
 * what makes the icon-only navigation usable without sight.
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 */
const step = (page, label) =>
  page.getByRole('button', { name: new RegExp(`Etapa \\d+: ${label}\\.`) })

/**
 * Tone cards and trait chips share labels, so each is scoped to its section.
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
const tone = (page, name) =>
  page.locator('.card-grid').getByRole('checkbox', { name: new RegExp(name) })

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
const trait = (page, name) =>
  page.locator('.chip-row').getByRole('checkbox', { name, exact: true })

test('builds an agent end to end and copies the Markdown (SPEC 72)', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  // --- open studio -> create agent -------------------------------------
  await page.goto('/')
  await page.getByRole('button', { name: 'Criar novo agente' }).click()
  await expect(page.getByRole('heading', { name: 'Como seu agente se chama?' })).toBeVisible()

  await page.getByLabel('Nome do agente').fill('Tutor de Inglês')
  await page.getByLabel('Descrição curta').fill('Ajuda a praticar inglês todos os dias.')

  // --- objective --------------------------------------------------------
  await step(page, 'Objetivo').click()
  await page
    .getByLabel('O que este agente existe para fazer?')
    .fill('Ajudar pessoas a praticar inglês com conversas curtas e correções gentis.')

  // --- personality ------------------------------------------------------
  await step(page, 'Personalidade').click()
  await tone(page, 'Amigável').click()
  await tone(page, 'Didático').click()
  await page.getByRole('radio', { name: /Passo a passo/ }).click()
  await trait(page, 'Paciente').click()

  await expect(tone(page, 'Amigável')).toHaveAttribute('aria-checked', 'true')

  // The third tone is allowed; a fourth must be refused (SPEC 23).
  await tone(page, 'Calmo').click()
  await tone(page, 'Criativo').click()
  await expect(tone(page, 'Criativo')).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByText(/no máximo 3 tons/)).toBeVisible()

  // --- hard rules -------------------------------------------------------
  await step(page, 'Guard Rails').click()
  await page.getByLabel('Nova regra').fill('Corrija erros sem constranger o aluno.')
  await page.getByLabel('Nova regra').press('Enter')
  await expect(page.getByRole('textbox', { name: 'Regra 5' })).toHaveValue(
    'Corrija erros sem constranger o aluno.'
  )

  // --- enable a tool ----------------------------------------------------
  await step(page, 'Ferramentas').click()
  await page.getByRole('checkbox', { name: /Web Search/ }).click()
  await expect(page.getByRole('checkbox', { name: /Web Search/ })).toHaveAttribute(
    'aria-checked',
    'true'
  )

  // --- memory -----------------------------------------------------------
  await step(page, 'Memória').click()
  await page.getByRole('radio', { name: /Memória persistente/ }).click()
  await trait(page, 'Lembrar preferências do usuário').click()

  // --- preview reflects everything, live --------------------------------
  // It starts collapsed, so the builder owns the full width until asked.
  const preview = page.locator('.preview__body')
  await expect(preview).toBeHidden()
  await page.getByRole('button', { name: /Mostrar pré-visualização/ }).click()

  await expect(preview).toContainText('# Tutor de Inglês')
  await expect(preview).toContainText('## Purpose')
  await expect(preview).toContainText('Corrija erros sem constranger o aluno.')
  await expect(preview).toContainText('Web Search')
  await expect(preview).toContainText('Memória persistente')

  // --- copy the Markdown ------------------------------------------------
  await step(page, 'Exportar').click()
  await page.getByRole('button', { name: 'Copiar Markdown' }).click()
  await expect(page.getByText('Markdown copiado.')).toBeVisible()

  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toContain('# Tutor de Inglês')
  expect(clipboard).toContain('## Guard Rails')
  expect(clipboard).toContain('Corrija erros sem constranger o aluno.')
})

test('state survives a reload and the agent reaches the library (SPEC 73, 93)', async ({
  page,
}) => {
  await page.goto('/#/studio/new')
  await page.getByLabel('Nome do agente').fill('Agente Persistente')
  await step(page, 'Objetivo').click()
  await page.getByLabel('O que este agente existe para fazer?').fill('Sobreviver a um refresh.')

  // Autosave is debounced at 500ms (SPEC 57).
  await expect(page.locator('.save-status')).toContainText('Salvo automaticamente')

  await page.reload()
  await expect(page.getByLabel('Nome do agente')).toHaveValue('Agente Persistente')

  await page.goto('/#/studio')
  await expect(page.getByRole('heading', { name: 'Agente Persistente' })).toBeVisible()
})

test('reorders a hard rule with the keyboard alone (SPEC 65)', async ({ page }) => {
  await page.goto('/#/studio/new')
  await step(page, 'Guard Rails').click()

  const first = page.getByRole('textbox', { name: 'Regra 1' })
  const second = page.getByRole('textbox', { name: 'Regra 2' })
  const originalFirst = await first.inputValue()
  const originalSecond = await second.inputValue()

  // Space picks the rule up, ArrowDown moves it, Space drops it.
  await page.getByRole('button', { name: /Reordenar regra 1/ }).focus()
  await page.keyboard.press(' ')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press(' ')

  await expect(first).toHaveValue(originalSecond)
  await expect(second).toHaveValue(originalFirst)
})

test('duplicates and deletes an agent from the library (SPEC 95, 96)', async ({ page }) => {
  await page.goto('/#/studio/new')
  await page.getByLabel('Nome do agente').fill('Base')
  await expect(page.locator('.save-status')).toContainText('Salvo automaticamente')

  await page.goto('/#/studio')
  await page.getByRole('button', { name: /Duplicar: Base/ }).click()
  await expect(page.getByRole('heading', { name: 'Base — Cópia' })).toBeVisible()

  await page.getByRole('button', { name: /Excluir: Base — Cópia/ }).click()
  await expect(page.getByRole('heading', { name: /Excluir Base — Cópia\?/ })).toBeVisible()
  await page.locator('dialog.dialog').getByRole('button', { name: 'Excluir' }).click()
  await expect(page.getByRole('heading', { name: 'Base — Cópia' })).toHaveCount(0)
})

test('the command palette navigates to a step (SPEC 91)', async ({ page }) => {
  await page.goto('/#/studio/new')
  await page.keyboard.press('Control+k')

  const input = page.getByRole('combobox', { name: 'Buscar no estúdio' })
  await expect(input).toBeFocused()
  // Accent-insensitive: "memoria" must find "Memória".
  await input.fill('memoria')
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { name: 'O que ele deve lembrar de você?' })).toBeVisible()
})

test('export is gated until name and objective exist (SPEC 50)', async ({ page }) => {
  await page.goto('/#/studio/new')
  await step(page, 'Exportar').click()

  await expect(page.getByText('Seu agente ainda não tem nome.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Baixar ZIP' })).toHaveCount(0)

  await step(page, 'Nome').click()
  await page.getByLabel('Nome do agente').fill('Pronto')
  await step(page, 'Objetivo').click()
  await page.getByLabel('O que este agente existe para fazer?').fill('Ter um objetivo.')

  await step(page, 'Exportar').click()
  await expect(page.getByRole('button', { name: 'Baixar ZIP' })).toBeVisible()
})

test('downloads a real ZIP of the exported structure (SPEC 36)', async ({ page }) => {
  await page.goto('/#/studio/new')
  await page.getByLabel('Nome do agente').fill('Agente Exportado')
  await step(page, 'Objetivo').click()
  await page.getByLabel('O que este agente existe para fazer?').fill('Ser exportado em ZIP.')

  await step(page, 'Exportar').click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar ZIP' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('agente-exportado.zip')
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const bytes = Buffer.concat(chunks)

  // "PK\x03\x04" — a real archive, not an empty blob.
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('PK')
  expect(bytes.length).toBeGreaterThan(200)
})

test('both side panels collapse, remember the choice, and stay in sync', async ({ page }) => {
  await page.goto('/#/studio/new')

  // Defaults: preview closed, sidebar reduced to its icon rail.
  await expect(page.locator('.builder')).toHaveAttribute('data-preview', 'collapsed')
  await expect(page.locator('.builder')).toHaveAttribute('data-sidebar', 'collapsed')
  await expect(page.locator('.preview__body')).toBeHidden()

  // The rail must not scroll sideways, and labels must be out of sight.
  const rail = await page.evaluate(() => {
    const el = document.querySelector('.sidebar')
    const body = document.querySelector('.step__body')
    if (!el) throw new Error('sidebar not found')
    return {
      overflows: el.scrollWidth > el.clientWidth,
      labelVisible: body ? getComputedStyle(body).display !== 'none' : true,
    }
  })
  expect(rail.overflows).toBe(false)
  expect(rail.labelVisible).toBe(false)

  await page.getByRole('button', { name: /Expandir menu/ }).click()
  await page.getByRole('button', { name: /Mostrar pré-visualização/ }).click()
  await expect(page.locator('.builder')).toHaveAttribute('data-sidebar', 'expanded')
  await expect(page.locator('.preview__body')).toBeVisible()

  // Both choices survive a reload.
  await page.reload()
  await expect(page.locator('.builder')).toHaveAttribute('data-sidebar', 'expanded')
  await expect(page.locator('.builder')).toHaveAttribute('data-preview', 'expanded')
})

test('sections start open and collapse on demand', async ({ page }) => {
  await page.goto('/#/studio/new')

  const identity = page.getByRole('button', { name: /Identidade/ })
  await expect(identity).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByLabel('Nome do agente')).toBeVisible()

  await identity.click()
  await expect(identity).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByLabel('Nome do agente')).toBeHidden()
})

test('a template fills in every step, not just the header', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /modelo Redator de E-mails de Vendas/ }).click()

  // Identity
  await expect(page.getByLabel('Nome do agente')).toHaveValue('Redator de E-mails de Vendas')

  // Objective
  await step(page, 'Objetivo').click()
  // toHaveValue, not toContainText: a textarea's textContent stays empty.
  await expect(page.getByLabel('O que este agente existe para fazer?')).toHaveValue(
    /e-mails de vendas/
  )

  // Soul
  await step(page, 'Soul').click()
  await expect(page.getByLabel('Missão')).not.toHaveValue('')
  await expect(page.getByLabel('Essência')).not.toHaveValue('')

  // Personality
  await step(page, 'Personalidade').click()
  await expect(tone(page, 'Consultivo')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radio', { name: /Claro e direto/ })).toHaveAttribute(
    'aria-checked',
    'true'
  )

  // Hard rules — the template's own, not the generic defaults.
  await step(page, 'Guard Rails').click()
  await expect(page.getByRole('textbox', { name: 'Regra 1' })).toHaveValue(
    'Nunca invente números, cases ou resultados de clientes.'
  )
  await expect(page.locator('.rule__input')).toHaveCount(6)

  // Tools
  await step(page, 'Ferramentas').click()
  await expect(page.getByRole('checkbox', { name: /Web Search/ })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await expect(page.getByRole('checkbox', { name: /Email/ })).toHaveAttribute('aria-checked', 'true')

  // Memory, including the template's extra restriction on top of the defaults.
  await step(page, 'Memória').click()
  await expect(page.getByRole('radio', { name: /Memória persistente/ })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await expect(page.getByText(/dados de contato de prospects/)).toBeVisible()
  await expect(page.getByText('Nunca armazenar senhas.')).toBeVisible()

  // It becomes a real saved agent, since it arrives already named.
  await expect(page.locator('.save-status')).toContainText('Salvo automaticamente')
  await page.goto('/#/studio')
  await expect(page.getByRole('heading', { name: 'Redator de E-mails de Vendas' })).toBeVisible()
})

test('every template opens a valid agent and exports', async ({ page }) => {
  for (const name of [
    /modelo Redator de E-mails de Vendas/,
    /modelo Designer de Dashboards/,
    /modelo Pesquisador de Benchmark/,
  ]) {
    await page.goto('/')
    await page.getByRole('button', { name }).click()

    await step(page, 'Exportar').click()
    // No blockers means name and objective both arrived filled (SPEC 50).
    await expect(page.getByRole('button', { name: 'Baixar ZIP' })).toBeVisible()
    await expect(page.getByText('Falta pouco para exportar')).toHaveCount(0)
  }
})

test('a template does not destroy an unnamed draft', async ({ page }) => {
  // Write something without ever naming the agent: it lives in the draft slot.
  await page.goto('/#/studio/new')
  await step(page, 'Objetivo').click()
  await page
    .getByLabel('O que este agente existe para fazer?')
    .fill('Rascunho que não pode ser perdido.')
  await expect(page.locator('.save-status')).toContainText('Salvo automaticamente')

  // Pick a template, which is named and so gets promoted to the library.
  await page.goto('/')
  await page.getByRole('button', { name: /modelo Designer de Dashboards/ }).click()
  await expect(page.locator('.save-status')).toContainText('Salvo automaticamente')

  // The untouched draft must still be there.
  await page.goto('/#/studio/new')
  await step(page, 'Objetivo').click()
  await expect(page.getByLabel('O que este agente existe para fazer?')).toHaveValue(
    'Rascunho que não pode ser perdido.'
  )
})

test('templates are reachable from the empty library and the palette', async ({ page }) => {
  await page.goto('/#/studio')
  await expect(page.getByRole('heading', { name: 'Ou comece com um modelo' })).toBeVisible()

  await page.keyboard.press('Control+k')
  const input = page.getByRole('combobox', { name: 'Buscar no estúdio' })
  await input.fill('vendas')
  await page.keyboard.press('Enter')

  await expect(page.getByLabel('Nome do agente')).toHaveValue('Redator de E-mails de Vendas')
})

test('the keynote runs end to end from both entry points', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Como funciona?' }).click()

  const keynote = page.locator('dialog.keynote')
  await expect(keynote).toBeVisible()
  await expect(page.locator('.keynote__title')).toHaveText('O que é um agente?')
  await expect(page.locator('.keynote__counter')).toHaveText('1 / 10')
  // Nothing to go back to on the first slide.
  await expect(page.getByRole('button', { name: 'Slide anterior' })).toBeDisabled()

  // Walk to the end with the keyboard alone.
  for (let i = 0; i < 9; i += 1) await page.keyboard.press('ArrowRight')

  await expect(page.locator('.keynote__counter')).toHaveText('10 / 10')
  await expect(page.locator('.keynote__title')).toHaveText('Agora esculpe o seu')
  await expect(page.getByRole('button', { name: 'Próximo slide' })).toBeDisabled()

  // Back one, then jump home and to the end.
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.keynote__counter')).toHaveText('9 / 10')
  await page.keyboard.press('Home')
  await expect(page.locator('.keynote__counter')).toHaveText('1 / 10')

  await page.keyboard.press('Escape')
  await expect(keynote).toHaveCount(0)

  // The header opens the same experience, from inside the builder.
  await page.goto('/#/studio/new')
  await page.getByRole('button', { name: 'Como funciona' }).click()
  await expect(page.locator('dialog.keynote')).toBeVisible()
})

test('the keynote explains Guard Rails with the nose that grows', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Como funciona?' }).click()
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowRight')

  await expect(page.locator('.keynote__title')).toHaveText('Guard Rails')
  await expect(page.locator('.keynote__story')).toContainText('o nariz crescia')

  // The drawing has to change too, not just the words: the nose wedge is
  // markedly longer on this slide than on any other.
  const noseWidth = async () =>
    page.evaluate(() => {
      const paths = [...document.querySelectorAll('.puppet path')]
      const nose = paths.find((p) => (p.getAttribute('d') ?? '').startsWith('M100 100 L'))
      return nose ? nose.getBoundingClientRect().width : 0
    })

  const onGuardRails = await noseWidth()
  await page.keyboard.press('ArrowRight')
  const onTools = await noseWidth()

  expect(onGuardRails).toBeGreaterThan(onTools * 2)
})

test('the closing slide leads into the builder', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Como funciona?' }).click()
  await page.keyboard.press('End')

  await page.getByRole('button', { name: 'Criar meu agente' }).click()
  await expect(page.locator('dialog.keynote')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Como seu agente se chama?' })).toBeVisible()
})

test('the export says Guard Rails, not Hard Rules', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  await page.goto('/#/studio/new/sales-email')
  await step(page, 'Exportar').click()
  await page.getByRole('button', { name: 'Copiar Markdown' }).click()

  const markdown = await page.evaluate(() => navigator.clipboard.readText())
  expect(markdown).toContain('## Guard Rails')
  expect(markdown).not.toContain('Hard Rules')
})

test('undo restores a deleted rule (SPEC 58)', async ({ page }) => {
  await page.goto('/#/studio/new')
  await step(page, 'Guard Rails').click()

  const originalFirst = await page.getByRole('textbox', { name: 'Regra 1' }).inputValue()
  await page.getByRole('button', { name: 'Remover regra 1' }).click()
  await expect(page.getByRole('textbox', { name: 'Regra 1' })).not.toHaveValue(originalFirst)

  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect(page.getByRole('textbox', { name: 'Regra 1' })).toHaveValue(originalFirst)
})
