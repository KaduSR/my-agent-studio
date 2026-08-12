import { expect, test } from '@playwright/test'
import { KEYNOTE } from '../../js/data/keynote.js'
import { KEYNOTE_AGENTIC } from '../../js/data/keynote-agentic.js'
import { GLOSSARY } from '../../js/data/glossary.js'
import { TEMPLATES } from '../../js/data/templates.js'

/*
 * The counters are derived from the content, not spelled out: adding a slide or a
 * term is a routine edit and should not need three literals updated with it.
 */
const SLIDES = KEYNOTE.length
const AGENTIC_SLIDES = KEYNOTE_AGENTIC.length
const TERMS = GLOSSARY.length
const MODELS = TEMPLATES.length
/** The gallery deals six to a page. */
const MODEL_PAGES = Math.ceil(MODELS / 6)

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

/**
 * The keynote opens on a menu of tracks, so every deck test starts by picking
 * one. Scoped to the card so the title inside the deck cannot match instead.
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
const openTrack = async (page, title) => {
  await page.getByRole('button', { name: 'Como funciona?' }).click()
  await page.locator('.keynote__track', { hasText: title }).click()
}

/**
 * Walk a deck until the note with this title is on screen.
 *
 * By title rather than by a count of arrow presses: the decks are edited often,
 * and a test that counts keystrokes breaks on every note inserted in the middle
 * without saying anything about what actually went wrong.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 * @param {number} total How many notes the deck has.
 */
const goToNote = async (page, title, total) => {
  for (let i = 0; i < total; i += 1) {
    if ((await page.locator('.keynote__title').textContent()) === title) return
    await page.keyboard.press('ArrowRight')
  }
  await expect(page.locator('.keynote__title')).toHaveText(title)
}

test('builds an agent end to end and copies the Markdown (SPEC 72)', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  // --- open studio -> create agent -------------------------------------
  await page.goto('/')
  await page.getByRole('button', { name: 'Criar novo agente' }).click()
  await page.getByRole('button', { name: /Começar do zero/ }).click()
  await expect(page.getByRole('heading', { name: 'Como seu agente se chama?' })).toBeVisible()

  await page.getByLabel('Nome do agente').fill('Tutor de Inglês')
  await page.getByLabel('Descrição curta').fill('Ajuda a praticar inglês todos os dias.')

  // --- objective --------------------------------------------------------
  await step(page, 'Objetivo').click()
  await page
    .getByLabel('O que este agente existe para fazer?')
    .fill('Ajudar pessoas a praticar inglês com conversas curtas e correções gentis.')

  // --- soul, from a base archetype --------------------------------------
  await step(page, 'Soul').click()
  await page.getByRole('button', { name: /Tutor Socrático/ }).click()
  await expect(page.getByText(/Soul Tutor Socrático aplicada/)).toBeVisible()
  await expect(page.getByLabel('Missão')).toHaveValue(
    'Fazer a pessoa sair sabendo explicar o assunto com as próprias palavras.'
  )
  await expect(trait(page, 'Empatia')).toHaveAttribute('aria-checked', 'true')

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

  // --- knowledge: one from the catalogue, one written by hand -----------
  await step(page, 'Conhecimento').click()
  await page.locator('.knowledge-card', { hasText: 'Lidar com incerteza' }).click()
  await expect(page.getByText('Lidar com incerteza adicionado.')).toBeVisible()
  await expect(page.locator('.knowledge-doc')).toHaveCount(1)

  await page.getByRole('button', { name: /Escrever documento/ }).click()
  await page.getByLabel('Título').fill('Correções gentis')
  await page.getByLabel('Conteúdo').fill('# Correções gentis\n\n- Elogie a tentativa primeiro.')
  await expect(page.locator('.knowledge-editor__preview')).toContainText(
    'Elogie a tentativa primeiro.'
  )
  await page.getByRole('button', { name: /Adicionar/ }).click()
  await expect(page.locator('.knowledge-doc')).toHaveCount(2)
  await expect(page.getByText('2/12')).toBeVisible()

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
  await expect(preview).toContainText('## Knowledge')
  await expect(preview).toContainText('### Correções gentis')
  await expect(preview).toContainText('Memória persistente')

  // --- copy the Markdown ------------------------------------------------
  await step(page, 'Exportar').click()
  await page.getByRole('button', { name: 'Copiar Markdown' }).click()
  await expect(page.getByText('Markdown copiado.')).toBeVisible()

  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toContain('# Tutor de Inglês')
  expect(clipboard).toContain('## Guard Rails')
  expect(clipboard).toContain('Corrija erros sem constranger o aluno.')
  expect(clipboard).toContain('## Knowledge')
  expect(clipboard).toContain('Elogie a tentativa primeiro.')
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
  await expect(page.getByRole('heading', { name: 'Cópia de Base' })).toBeVisible()

  await page.getByRole('button', { name: /Excluir: Cópia de Base/ }).click()
  await expect(page.getByRole('heading', { name: /Excluir Cópia de Base\?/ })).toBeVisible()
  await page.locator('dialog.dialog').getByRole('button', { name: 'Excluir' }).click()
  await expect(page.getByRole('heading', { name: 'Cópia de Base' })).toHaveCount(0)
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

  // The save file is not documentation, so the gate does not apply to it: a
  // half-filled agent is exactly what someone wants to carry elsewhere.
  await expect(page.getByRole('button', { name: 'Baixar JSON do agente' })).toBeVisible()

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

test('creating an agent asks how to start', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Criar novo agente' }).click()

  const chooser = page.locator('dialog.dialog--choices')
  await expect(chooser).toBeVisible()
  await expect(chooser.getByRole('button', { name: /Começar do zero/ })).toBeVisible()
  await expect(chooser.getByRole('button', { name: /Usar um modelo/ })).toBeVisible()
  await expect(chooser.getByRole('button', { name: /Importar JSON/ })).toBeVisible()

  // Cancelling leaves the user where they were.
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(chooser).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'My Agent Studio' })).toBeVisible()

  // The model route hands over to the gallery.
  await page.getByRole('button', { name: 'Criar novo agente' }).click()
  await page.getByRole('button', { name: /Usar um modelo/ }).click()
  await expect(page.locator('dialog.gallery')).toBeVisible()
})

test('the gallery deals every model out in pages', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ver todos os modelos' }).click()

  const gallery = page.locator('dialog.gallery')
  await expect(gallery).toBeVisible()
  await expect(page.locator('.gallery__counter')).toHaveText(`1 / ${MODEL_PAGES}`)
  await expect(page.locator('.gallery__page')).toHaveCount(MODEL_PAGES)
  await expect(gallery.getByRole('button', { name: 'Modelos anteriores' })).toBeDisabled()

  // Every template is present, six to a page.
  await expect(gallery.locator('.template-card')).toHaveCount(MODELS)

  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.gallery__counter')).toHaveText(`2 / ${MODEL_PAGES}`)
  await page.keyboard.press('End')
  await expect(page.locator('.gallery__counter')).toHaveText(`${MODEL_PAGES} / ${MODEL_PAGES}`)
  await expect(gallery.getByRole('button', { name: 'Próximos modelos' })).toBeDisabled()

  // The Instagram-minded ones live on the last page.
  await expect(gallery.getByRole('button', { name: /modelo Ideias de Reels/ })).toBeVisible()

  // Off-screen pages are inert, so Tab cannot reach a card nobody can see.
  await expect(page.locator('.gallery__page').first()).toHaveAttribute('aria-hidden', 'true')

  await page.locator('.gallery__dot').first().click()
  await expect(page.locator('.gallery__counter')).toHaveText(`1 / ${MODEL_PAGES}`)

  // Picking a card closes the gallery and opens that agent, already filled in.
  await gallery.getByRole('button', { name: /modelo Revisor de Código/ }).click()
  await expect(gallery).toHaveCount(0)
  await expect(page.getByLabel('Nome do agente')).toHaveValue('Revisor de Código')
})

test('the tools step is searchable, grouped, and takes a tool of your own', async ({ page }) => {
  await page.goto('/#/studio/new/devops-oncall')
  await step(page, 'Ferramentas').click()

  // Four of the template's tools are on, out of the whole catalogue.
  await expect(page.locator('.count-badge')).toHaveText('4 de 26 ativas')
  await expect(page.locator('.tool-group')).toHaveCount(6)

  // Search reaches the description and the category name, not just the title.
  await page.getByLabel('Buscar ferramenta').fill('git')
  await expect(page.getByRole('checkbox', { name: /Git/ })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Web Search/ })).toHaveCount(0)

  await page.getByLabel('Buscar ferramenta').fill('nada que exista')
  await expect(page.getByText('Nenhuma ferramenta encontrada')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(page.getByRole('checkbox', { name: /Web Search/ })).toBeVisible()

  await page.getByRole('button', { name: 'Dados' }).click()
  await expect(page.locator('.tool-group')).toHaveCount(1)
  await page.getByRole('button', { name: 'Todas' }).click()

  // --- permission -------------------------------------------------------
  await page.getByLabel('Buscar ferramenta').fill('terminal')
  const terminal = page.locator('.tool-cell', { hasText: 'Terminal' })
  await expect(terminal.getByRole('radio', { name: /Pergunta antes/ })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await terminal.getByRole('radio', { name: /Só leitura/ }).click()
  await expect(terminal.getByRole('radio', { name: /Só leitura/ })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await page.getByLabel('Buscar ferramenta').fill('')

  // --- a tool of your own -----------------------------------------------
  await page.getByRole('button', { name: /Adicionar ferramenta/ }).click()
  const dialog = page.locator('dialog.dialog')
  await dialog.getByRole('textbox', { name: 'Nome' }).fill('Servidor MCP do time')
  await dialog.getByRole('textbox', { name: 'O que ela faz' }).fill('Consulta o catálogo interno.')
  await dialog.getByRole('button', { name: 'Adicionar' }).click()

  await expect(page.locator('.count-badge')).toHaveText('5 de 27 ativas')
  await expect(page.getByRole('checkbox', { name: /Servidor MCP do time/ })).toBeVisible()

  // Both reach the document. (The preview starts collapsed.)
  await page.getByRole('button', { name: /Mostrar pré-visualização/ }).click()
  const preview = page.locator('.preview__body')
  await expect(preview).toContainText('Servidor MCP do time')
  await expect(preview).toContainText('Permissão: somente leitura')

  // A catalogue tool cannot be deleted; a custom one can.
  await expect(page.getByRole('button', { name: 'Remover ferramenta: Terminal' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Remover ferramenta: Servidor MCP do time' }).click()
  await expect(page.locator('.count-badge')).toHaveText('4 de 26 ativas')
})

test('the export step separates prompts from kits', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  await page.goto('/#/studio/new/sales-email')
  await step(page, 'Exportar').click()

  // Three families, each its own radiogroup.
  await expect(page.locator('.preset-family')).toHaveCount(3)
  await expect(page.getByRole('heading', { name: 'Prompt de criação' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Documento único' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Kit para ferramentas' })).toBeVisible()

  // A kit is a folder, and offers a ZIP.
  await expect(page.getByRole('button', { name: 'Baixar ZIP' })).toBeVisible()

  // A prompt is one file, and offers what someone came for: copying it.
  await page.getByRole('radio', { name: /Prompt para Claude Code/ }).click()
  await expect(page.getByRole('button', { name: 'Baixar ZIP' })).toHaveCount(0)
  await expect(page.locator('.export-hint')).toContainText('conversa nova do Claude Code')
  await expect(page.locator('.tree__file--single')).toHaveText('prompt-claude-code.md')

  await page.getByRole('button', { name: 'Copiar prompt' }).click()
  const prompt = await page.evaluate(() => navigator.clipboard.readText())
  expect(prompt).toContain('CLAUDE.md')
  expect(prompt).toContain('<agente>')
  expect(prompt).toContain('Redator de E-mails de Vendas')

  // ChatGPT and Gemini say where their text goes.
  await page.getByRole('radio', { name: /Prompt para ChatGPT/ }).click()
  await expect(page.locator('.export-hint')).toContainText('GPT personalizado')
  await page.getByRole('radio', { name: /Prompt para Gemini/ }).click()
  await expect(page.locator('.export-hint')).toContainText('Gem')

  // The single document keeps its own pair of actions.
  await page.getByRole('radio', { name: /Markdown único/ }).click()
  await expect(page.getByRole('button', { name: 'Baixar AGENT.md' })).toBeVisible()
  await expect(page.locator('.tree__file--single')).toHaveText('AGENT.md')
})

test('an agent survives a round trip through JSON', async ({ page }) => {
  // --- export ------------------------------------------------------------
  await page.goto('/#/studio/new/benchmark-research')
  await step(page, 'Exportar').click()

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar JSON do agente' }).click(),
  ]).then(([event]) => event)

  expect(download.suggestedFilename()).toBe('pesquisador-de-benchmark.agent.json')

  const path = await download.path()
  const { readFile } = await import('node:fs/promises')
  const exported = await readFile(path, 'utf8')
  expect(JSON.parse(exported).agent.name).toBe('Pesquisador de Benchmark')

  // --- import ------------------------------------------------------------
  await page.goto('/')
  await page.getByRole('button', { name: 'Criar novo agente' }).click()
  await page.getByRole('button', { name: /Importar JSON/ }).click()
  await page.locator('dialog.dialog--choices input[type=file]').setInputFiles({
    name: 'pesquisador.agent.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exported, 'utf8'),
  })

  await expect(page.getByLabel('Nome do agente')).toHaveValue('Pesquisador de Benchmark')

  // Not just the header: the steps behind it came back too.
  await step(page, 'Guard Rails').click()
  await expect(page.getByRole('textbox', { name: 'Regra 1' })).toHaveValue(
    'Cite a fonte de cada afirmação comparativa.'
  )
})

test('a broken file is refused with a readable reason', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Criar novo agente' }).click()
  await page.getByRole('button', { name: /Importar JSON/ }).click()
  await page.locator('dialog.dialog--choices input[type=file]').setInputFiles({
    name: 'lista.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"pedido": 42}', 'utf8'),
  })

  await expect(page.locator('.toast')).toContainText('não descreve um agente')
  // The dialog stays open, so the user can try another file.
  await expect(page.locator('dialog.dialog--choices')).toBeVisible()
})

test('the keynote runs end to end from both entry points', async ({ page }) => {
  await page.goto('/')
  await openTrack(page, 'Meu primeiro agente')

  const keynote = page.locator('dialog.keynote')
  await expect(keynote).toBeVisible()
  await expect(page.locator('.keynote__title')).toHaveText('O que é um agente?')
  await expect(page.locator('.keynote__counter')).toHaveText(`1 / ${SLIDES}`)
  // Nothing to go back to on the first slide.
  await expect(page.getByRole('button', { name: 'Nota anterior' })).toBeDisabled()

  // The model comes before step 1: the opening slide says what the user builds
  // is not the model, so the next one has to say what the model is.
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.keynote__title')).toHaveText('O cérebro artificial')
  await expect(page.locator('.keynote__lesson')).toContainText('LLM')
  // The point of the image: the brain arrived ready and was fitted in, which is
  // what "pre-trained" means without using the word.
  await expect(page.locator('.keynote__story')).toContainText('já vinha pronto')

  // Walk to the end with the keyboard alone.
  for (let i = 0; i < SLIDES - 2; i += 1) await page.keyboard.press('ArrowRight')

  await expect(page.locator('.keynote__counter')).toHaveText(`${SLIDES} / ${SLIDES}`)
  await expect(page.locator('.keynote__title')).toHaveText('Agora esculpe o seu')
  await expect(page.getByRole('button', { name: 'Próxima nota' })).toBeDisabled()

  // Back one, then jump home and to the end.
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.keynote__counter')).toHaveText(`${SLIDES - 1} / ${SLIDES}`)
  await page.keyboard.press('Home')
  await expect(page.locator('.keynote__counter')).toHaveText(`1 / ${SLIDES}`)

  await page.keyboard.press('Escape')
  await expect(keynote).toHaveCount(0)

  // The header opens the same experience, from inside the builder.
  await page.goto('/#/studio/new')
  await page.getByRole('button', { name: 'Como funciona' }).click()
  await expect(page.locator('dialog.keynote')).toBeVisible()
  await expect(page.locator('.keynote__track')).toHaveCount(2)
})

test('the keynote explains Guard Rails with the nose that grows', async ({ page }) => {
  await page.goto('/')
  await openTrack(page, 'Meu primeiro agente')
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowRight')

  await expect(page.locator('.keynote__title')).toHaveText('Guard Rails')
  await expect(page.locator('.keynote__story')).toContainText('o nariz crescia')
  // The tag is on the first track too: the story stays Pinocchio, the corner
  // always says what the industry calls it.
  await expect(page.locator('.keynote__term')).toHaveText('Guardrails')

  // The drawing has to change too, not just the words: the nose wedge is
  // markedly longer on this slide than on any other.
  const noseWidth = async () =>
    page.evaluate(() => {
      const paths = [...document.querySelectorAll('.puppet path')]
      const nose = paths.find((p) => (p.getAttribute('d') ?? '').startsWith('M100 100 L'))
      return nose ? nose.getBoundingClientRect().width : 0
    })

  // The nose grows into place over half a second, so both measurements are
  // taken with the drawing at rest rather than mid-animation.
  await page.waitForTimeout(700)
  const onGuardRails = await noseWidth()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(700)
  const onTools = await noseWidth()

  expect(onGuardRails).toBeGreaterThan(onTools * 2)
})

test('the wiki explains the vocabulary with the same puppet', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Dicionário de termos' }).click()

  const wiki = page.locator('dialog.wiki')
  await expect(wiki).toBeVisible()
  await expect(page.locator('.wiki__term')).toHaveText('LLM')
  await expect(page.locator('.wiki__counter')).toHaveText(`1 / ${TERMS}`)
  await expect(page.getByRole('button', { name: 'Termo anterior' })).toBeDisabled()

  // Every term is reachable from the rail, in any order.
  await wiki.locator('.wiki__rail-item', { hasText: 'Harness' }).click()
  await expect(page.locator('.wiki__term')).toHaveText('Harness')
  await expect(page.locator('.wiki__plain')).toContainText('estrutura em volta do modelo')
  await expect(page.locator('.wiki__story')).toContainText('cruzeta')

  // And the arrows walk it like the keynote.
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.wiki__term')).toHaveText('Ferramentas')
  await page.keyboard.press('End')
  await expect(page.locator('.wiki__term')).toHaveText('Alucinação')
  await expect(page.getByRole('button', { name: 'Próximo termo' })).toBeDisabled()

  // The figure is the keynote's, and it is moving here too.
  const pose = () =>
    page.evaluate(() => {
      const figure = document.querySelector('.wiki__art .puppet > g')
      return figure ? getComputedStyle(figure).transform : 'none'
    })

  const before = await pose()
  await page.waitForTimeout(240)
  expect(before).not.toBe('none')
  expect(await pose()).not.toBe(before)

  await page.keyboard.press('Escape')
  await expect(wiki).toHaveCount(0)

  // It is in the header everywhere, not only on the home page.
  await page.goto('/#/studio/new')
  await page.getByRole('button', { name: 'Dicionário de termos' }).click()
  await expect(page.locator('dialog.wiki')).toBeVisible()
})

test('the puppet is alive on every slide, not only on the ones with props', async ({ page }) => {
  await page.goto('/')
  await openTrack(page, 'Meu primeiro agente')
  await page.waitForTimeout(500)

  // The figure group carries the idle bob. Reading its computed transform twice
  // is what separates "has an animation" from "is actually moving".
  const pose = () =>
    page.evaluate(() => {
      const figure = document.querySelector('.keynote__art [data-role="figure"]')
      return figure ? getComputedStyle(figure).transform : 'none'
    })

  for (let slide = 1; slide <= 11; slide += 1) {
    const before = await pose()
    await page.waitForTimeout(240)
    const after = await pose()

    expect(before, `slide ${slide} has no transform`).not.toBe('none')
    expect(after, `slide ${slide} is frozen`).not.toBe(before)

    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(260)
  }
})

test('the closing slide leads into the builder', async ({ page }) => {
  await page.goto('/')
  await openTrack(page, 'Meu primeiro agente')
  await page.keyboard.press('End')

  await page.getByRole('button', { name: 'Criar meu agente' }).click()
  await expect(page.locator('dialog.keynote')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Como seu agente se chama?' })).toBeVisible()
})

test('the keynote menu offers two tracks, each with a living figure', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Como funciona?' }).click()

  const keynote = page.locator('dialog.keynote')
  await expect(keynote).toBeVisible()
  await expect(page.locator('.keynote__title')).toHaveText('Duas trilhas')
  await expect(page.locator('.keynote__hint')).toContainText('Escolha uma trilha')
  // Two decks is a choice, not a subject, so there is nothing to name yet.
  await expect(page.locator('.keynote__term')).toBeEmpty()

  const cards = page.locator('.keynote__track')
  await expect(cards).toHaveCount(2)
  await expect(cards.nth(0)).toContainText('Meu primeiro agente')
  await expect(cards.nth(0)).toContainText(`${SLIDES} slides`)
  await expect(cards.nth(1)).toContainText('Sistemas agênticos')
  await expect(cards.nth(1)).toContainText(`${AGENTIC_SLIDES} slides`)

  // The card figures are the FLIP source for entering a track, so they have to
  // be real puppets rather than static thumbnails.
  await page.waitForTimeout(400)
  const poses = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.keynote__track [data-role="figure"]')].map(
        (figure) => getComputedStyle(figure).transform
      )
    )

  const before = await poses()
  expect(before).toHaveLength(2)
  expect(before).not.toContain('none')
  await page.waitForTimeout(240)
  expect(await poses()).not.toEqual(before)

  // Arrows are a roving focus here, not navigation.
  await cards.nth(0).focus()
  await page.keyboard.press('ArrowRight')
  await expect(cards.nth(1)).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(cards.nth(0)).toBeFocused()
})

test('the agentic track runs end to end and comes back to the menu', async ({ page }) => {
  await page.goto('/')
  await openTrack(page, 'Sistemas agênticos')

  await expect(page.locator('.keynote__title')).toHaveText('A madeira que fala e esquece')
  await expect(page.locator('.keynote__track-label')).toHaveText('Sistemas agênticos')
  await expect(page.locator('.keynote__counter')).toHaveText(`1 / ${AGENTIC_SLIDES}`)
  await expect(page.locator('.keynote__term')).toHaveText('Stateless LLM')

  // The turn the whole track is built around: he takes the control cross.
  for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowRight')
  await expect(page.locator('.keynote__title')).toHaveText('Quando ele pega a cruzeta')
  await expect(page.locator('.keynote__lesson')).toContainText('controle de fluxo')
  await expect(page.locator('.keynote__term')).toHaveText('Agent loop')

  await page.keyboard.press('End')
  await expect(page.locator('.keynote__counter')).toHaveText(
    `${AGENTIC_SLIDES} / ${AGENTIC_SLIDES}`
  )
  await expect(page.locator('.keynote__title')).toHaveText('De onde isso vem')
  await expect(page.getByRole('button', { name: 'Próxima nota' })).toBeDisabled()

  // Sources open away from the app rather than swallowing the click.
  const source = page.locator('.knote-link__anchor').first()
  await expect(source).toHaveAttribute('target', '_blank')
  await expect(source).toContainText('ByteByteGo')

  // Back to the menu, then into the other track: the two are siblings, not a
  // sequence.
  await page.getByRole('button', { name: 'Voltar para as trilhas' }).click()
  await expect(page.locator('.keynote__title')).toHaveText('Duas trilhas')
  await page.locator('.keynote__track', { hasText: 'Meu primeiro agente' }).click()
  await expect(page.locator('.keynote__title')).toHaveText('O que é um agente?')
  await expect(page.locator('.keynote__counter')).toHaveText(`1 / ${SLIDES}`)
})

test('the agentic slides carry their tables, their trace and their bars', async ({ page }) => {
  await page.goto('/')
  await openTrack(page, 'Sistemas agênticos')

  // The four workflow patterns, as the app's only real table.
  await goToNote(page, 'O trilho pintado no chão', AGENTIC_SLIDES)
  await expect(page.locator('.knote-table tbody tr')).toHaveCount(4)
  await expect(page.locator('.knote-table')).toContainText('Orquestrador-trabalhador')

  // ReAct, as a log that alternates reasoning and action.
  await goToNote(page, 'O diário do Grilo Falante', AGENTIC_SLIDES)
  await expect(page.locator('.knote-trace__row')).toHaveCount(8)
  await expect(page.locator('.knote-trace__row[data-kind="observation"]')).toHaveCount(2)
  await expect(page.locator('.knote-trace__row[data-kind="final"]')).toHaveCount(1)

  // Human in the loop, between the gates and the costs.
  await goToNote(page, 'A cruzeta de volta na mão de Gepeto', AGENTIC_SLIDES)
  await expect(page.locator('.knote-points .knote-point')).toHaveCount(3)
  await expect(page.locator('.keynote__blocks')).toContainText('Antes do que não se desfaz')

  // Compounding error, as the drop between two bars.
  await goToNote(page, 'A ponte de tábuas', AGENTIC_SLIDES)
  await expect(page.locator('.knote-meter__value').nth(0)).toHaveText('60%')
  await expect(page.locator('.knote-meter__value').nth(1)).toHaveText('36%')

  // The bars are grown, not painted at their final width.
  await page.waitForTimeout(1400)
  const widths = await page.evaluate(() =>
    [...document.querySelectorAll('.knote-meter__fill')].map((fill) =>
      Math.round(fill.getBoundingClientRect().width)
    )
  )
  expect(widths[0]).toBeGreaterThan(widths[1])

  // Workflow against agent, side by side.
  await goToNote(page, 'Trilho ou mar aberto', AGENTIC_SLIDES)
  await expect(page.locator('.knote-compare__column')).toHaveCount(2)

  // And the arc, with the agent on the top rung.
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.knote-ladder__rung')).toHaveCount(4)
  await expect(page.locator('.knote-ladder__rung[data-level="3"]')).toHaveText('Agente')
})

/**
 * A slide that has to be scrolled is not a slide.
 *
 * This is the test that keeps it true, because the failure mode is editorial
 * rather than structural: nothing breaks when a lesson gains two sentences, the
 * deck just quietly starts scrolling. The viewport here is the smallest size the
 * three column composition is designed to hold, so passing at 1024x700 means
 * passing on anything a laptop has.
 */
test('no slide in either track has to be scrolled', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 700 })

  const overflow = () =>
    page.evaluate(() => {
      const stage = document.querySelector('.keynote__stage')
      return stage ? stage.scrollHeight - stage.clientHeight : 0
    })

  const tracks = [
    { name: 'Meu primeiro agente', count: SLIDES },
    { name: 'Sistemas agênticos', count: AGENTIC_SLIDES },
  ]

  for (const { name, count } of tracks) {
    await page.goto('/')
    await openTrack(page, name)

    for (let slide = 1; slide <= count; slide += 1) {
      const title = await page.locator('.keynote__title').textContent()
      // One pixel of slack for sub-pixel line box rounding.
      expect(await overflow(), `${name} ${slide}: ${title}`).toBeLessThanOrEqual(1)
      if (slide < count) await page.keyboard.press('ArrowRight')
    }
  }
})

test('the puppet is alive on every slide of the agentic track too', async ({ page }) => {
  await page.goto('/')
  await openTrack(page, 'Sistemas agênticos')
  await page.waitForTimeout(500)

  /*
   * Several agentic scenes wrap the body in a static transform to make room for
   * the scenery, so `.puppet > g` is no longer reliably the animated group. The
   * figure marks itself instead.
   */
  const pose = () =>
    page.evaluate(() => {
      const figure = document.querySelector('.keynote__art [data-role="figure"]')
      return figure ? getComputedStyle(figure).transform : 'none'
    })

  for (let slide = 1; slide <= AGENTIC_SLIDES; slide += 1) {
    const before = await pose()
    await page.waitForTimeout(240)
    const after = await pose()

    expect(before, `slide ${slide} has no transform`).not.toBe('none')
    expect(after, `slide ${slide} is frozen`).not.toBe(before)

    if (slide < AGENTIC_SLIDES) {
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(260)
    }
  }
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
