import { expect, test } from '@playwright/test'
import { TEAM_LIMITS } from '../../js/team/defaults.js'

/*
 * Teams are built from saved agents, and building two agents through the nine
 * steps just to reach the office would make this a test of the builder. The
 * library is seeded directly instead, through the same storage key the app
 * reads, so what is under test here is the office and nothing else.
 */

/**
 * @param {string} id
 * @param {string} name
 * @param {string} objective
 * @param {string} updatedAt
 */
const agent = (id, name, objective, updatedAt) => ({
  id,
  name,
  description: '',
  objective,
  avatarId: 'friendly-bot',
  soul: { mission: '', essence: '', philosophy: '', values: [] },
  personality: { tones: [], responseStyle: '', traits: [] },
  guardRails: [],
  tools: [],
  knowledge: [],
  memory: { type: 'session', remember: [], restrictions: [] },
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt,
})

const AGENTS = [
  agent('seed-ana', 'Ana', 'Levantar fontes e checar cada dado.', '2026-08-03T10:00:00.000Z'),
  agent('seed-bruno', 'Bruno', 'Escrever textos claros para leigos.', '2026-08-02T10:00:00.000Z'),
  agent('seed-carla', 'Carla', 'Cortar o que sobra no texto.', '2026-08-01T10:00:00.000Z'),
]

/** @param {import('@playwright/test').Page} page */
const seed = (page) =>
  page.addInitScript((agents) => {
    localStorage.setItem('agent-studio:agents', JSON.stringify(agents))
  }, AGENTS)

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
const desk = (page, name) => page.locator('.desk').filter({ hasText: name }).first()

/**
 * The manager pill. Matched by class rather than by text, because "Gerente" is
 * also a word inside the field label the manager's desk carries.
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
const badge = (page, name) => desk(page, name).locator('.desk__badge')

/**
 * The order field starts folded, so reaching it means opening the desk first.
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {RegExp} label
 */
const openOrder = async (page, name, label) => {
  const seat = desk(page, name)
  if ((await seat.locator('details[open]').count()) === 0) {
    await seat.locator('summary').click()
  }
  return seat.getByLabel(label)
}

test('seats a team, gives the orders and carries the document out', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await seed(page)

  await page.goto('/')
  await page.getByRole('button', { name: 'Times de agentes' }).click()

  await expect(page.getByRole('heading', { name: 'Times de agentes' })).toBeVisible()
  await expect(page.getByText('Você ainda não montou nenhum time.')).toBeVisible()

  // The empty state offers the same action, so this is scoped to the header one.
  await page.locator('.library__header').getByRole('button', { name: 'Criar time' }).click()

  // A new team earns its own URL right away, so a reload never loses it.
  await expect(page).toHaveURL(/#\/times\/[^/]+$/)

  await page.getByLabel('Nome do time').fill('Time de Conteúdo')
  await page.getByLabel('Objetivo do time').fill('Publicar um artigo por semana, checado e revisado.')

  // --- seating, from the bench of recent agents ---------------------------
  await page.getByRole('button', { name: 'Sentar no time: Ana' }).click()
  await page.getByRole('button', { name: 'Sentar no time: Bruno' }).click()

  await expect(page.locator('.desk')).toHaveCount(2)
  // A seated agent leaves the bench, so nobody can be added twice.
  await expect(page.getByRole('button', { name: 'Sentar no time: Ana' })).toHaveCount(0)

  await (await openOrder(page, 'Ana', /Ordem para este agente/)).fill('Levantar cinco estudos recentes.')
  await (await openOrder(page, 'Bruno', /Ordem para este agente/)).fill('Escrever 800 palavras a partir das notas.')

  // --- the document ---------------------------------------------------------
  await page.getByRole('button', { name: 'Copiar Markdown' }).click()
  await expect(page.getByText('Markdown copiado.')).toBeVisible()

  const markdown = await page.evaluate(() => navigator.clipboard.readText())
  expect(markdown).toContain('# Time de Conteúdo')
  expect(markdown).toContain('## Orders')
  expect(markdown).toContain('1. **Ana**: Levantar cinco estudos recentes.')
  expect(markdown).toContain('2. **Bruno**: Escrever 800 palavras a partir das notas.')
  expect(markdown).not.toContain('## Coordination')

  // --- switching to a managed team -----------------------------------------
  await page.getByRole('radio', { name: /Time com gerente/ }).click()

  await expect(page.locator('.office__head')).toBeVisible()
  await expect(badge(page, 'Ana')).toBeVisible()
  await expect(desk(page, 'Bruno').locator('.desk__fold-label')).toHaveText('Especialidade no time')

  await desk(page, 'Bruno').getByRole('button', { name: 'Tornar gerente' }).click()
  await expect(badge(page, 'Bruno')).toBeVisible()
  await expect(badge(page, 'Ana')).toHaveCount(0)

  await page.getByRole('button', { name: 'Copiar Markdown' }).click()
  const managed = await page.evaluate(() => navigator.clipboard.readText())
  expect(managed).toContain('## Coordination')
  expect(managed).toContain('**Gerente:** Bruno')
  expect(managed).not.toContain('## Orders')

  // --- and it all survives a reload ----------------------------------------
  await page.reload()

  await expect(page.getByLabel('Nome do time')).toHaveValue('Time de Conteúdo')
  await expect(page.locator('.desk')).toHaveCount(2)
  await expect(badge(page, 'Bruno')).toBeVisible()
  await expect(
    await openOrder(page, 'Ana', /Especialidade no time/)
  ).toHaveValue('Levantar cinco estudos recentes.')
})

test('the ready-made marketing team arrives complete, agents and all', async ({ page }) => {
  // No seeding: the example has to bring its own agents, which is the point.
  await page.goto('/#/times')

  await page.getByRole('button', { name: /Time de Marketing/ }).click()

  await expect(page.getByLabel('Nome do time')).toHaveValue('Time de Marketing')
  await expect(page.locator('.desk')).toHaveCount(4)
  await expect(badge(page, 'Gerente de Marketing')).toBeVisible()
  await expect(page.locator('.office__head')).toBeVisible()

  // The orders come written, which is what makes it an example and not a shell.
  // Folded, the desk shows them as a line, so no click is needed to check.
  await expect(desk(page, 'Social Media').locator('.desk__fold-preview')).not.toHaveClass(
    /desk__fold-preview--empty/
  )

  // And the four agents are real, editable, and in the library.
  await page.goto('/#/studio')
  for (const name of ['Gerente de Marketing', 'Social Media', 'Copywriter de Conversão', 'Editor de SEO']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  }
})

test('the assembly line numbers its steps and lets them be reordered', async ({ page }) => {
  await page.goto('/#/times')
  await page.getByRole('button', { name: /Plantão de Qualidade/ }).click()

  await expect(page.locator('.desk')).toHaveCount(4)
  // Drawn as a pipeline, not as a room: work travels, so the picture says so.
  await expect(page.locator('.office')).toHaveAttribute('data-layout', 'flow')
  await expect(page.locator('.flow[data-shape="chain"]')).toBeVisible()
  await expect(page.locator('.flow__terminal--start')).toHaveText('Entrada')
  await expect(page.locator('.flow__terminal--end')).toHaveText('Entregue')
  // A line has no lead, it has an order.
  await expect(page.locator('.office__head')).toHaveCount(0)
  await expect(page.locator('.flow__return')).toHaveCount(0)
  await expect(page.locator('.desk__step')).toHaveText(['1', '2', '3', '4'])

  const first = page.locator('.desk').first()
  await expect(first).toContainText('Triador de Bugs')
  // The first desk cannot move earlier than first.
  await expect(first.getByRole('button', { name: /Mover para antes/ })).toBeDisabled()

  await first.getByRole('button', { name: /Mover para depois/ }).click()

  await expect(page.locator('.desk').first()).toContainText('Analista de QA')
  await expect(page.locator('.desk').nth(1)).toContainText('Triador de Bugs')
  await expect(page.locator('.desk__step')).toHaveText(['1', '2', '3', '4'])
})

test('the review table singles out an evaluator, not a manager', async ({ page }) => {
  await page.goto('/#/times')
  await page.getByRole('button', { name: /Mesa de Revisão/ }).click()

  // A loop, drawn as one: producers, the evaluator, and the arrow going back.
  await expect(page.locator('.flow[data-shape="review"]')).toBeVisible()
  await expect(page.locator('.flow__stack .desk')).toHaveCount(2)
  await expect(page.locator('.flow__group--lead .desk')).toHaveCount(1)
  await expect(page.locator('.flow__return-label')).toHaveText('devolve para corrigir')
  await expect(badge(page, 'Guardião da Marca')).toHaveText('Avaliador')
  await expect(desk(page, 'Redator Técnico').locator('.desk__fold-label')).toHaveText(
    'O que este agente produz'
  )
  // The evaluator never assigns work, so the action says so.
  await expect(
    desk(page, 'Redator Técnico').getByRole('button', { name: 'Tornar avaliador' })
  ).toBeVisible()
  await expect(page.locator('.desk__step')).toHaveCount(0)
})

test('downloads the kit Claude Code can run', async ({ page }) => {
  await seed(page)
  await page.goto('/#/times/new')

  await page.getByLabel('Nome do time').fill('Time de Conteúdo')
  await page.getByLabel('Objetivo do time').fill('Publicar um artigo por semana.')
  await page.getByRole('button', { name: 'Sentar no time: Ana' }).click()
  await page.getByRole('button', { name: 'Sentar no time: Bruno' }).click()
  await (await openOrder(page, 'Ana', /Ordem para este agente/)).fill('Levantar cinco estudos.')

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar kit para Claude Code' }).click(),
  ]).then(([event]) => event)

  expect(download.suggestedFilename()).toBe('time-de-conteudo.zip')

  // A real ZIP, not a renamed text file: the local file header magic is the
  // cheapest way to prove the hand-rolled writer produced something openable.
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const bytes = Buffer.concat(chunks)

  expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]))

  // The paths live in the archive as plain text, so the structure is assertable
  // without unzipping.
  const raw = bytes.toString('latin1')
  expect(raw).toContain('time-de-conteudo/CLAUDE.md')
  expect(raw).toContain('time-de-conteudo/.claude/agents/ana.md')
  expect(raw).toContain('time-de-conteudo/.claude/agents/bruno.md')
  expect(raw).toContain('time-de-conteudo/team.json')
})

test('downloads the team as a single document', async ({ page }) => {
  await seed(page)
  await page.goto('/#/times/new')

  await page.getByLabel('Nome do time').fill('Time de Pesquisa')
  await page.getByLabel('Objetivo do time').fill('Responder perguntas com fonte.')
  await page.getByRole('button', { name: 'Sentar no time: Ana' }).click()

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar .md' }).click(),
  ]).then(([event]) => event)

  expect(download.suggestedFilename()).toBe('time-de-pesquisa.md')
})

test('says what is missing instead of only dimming the buttons', async ({ page }) => {
  await seed(page)
  await page.goto('/#/times/new')

  await expect(page.getByText('Dê um nome ao time.')).toBeVisible()
  await expect(page.getByText('Escreva o objetivo do time.')).toBeVisible()
  await expect(page.getByText('Sente pelo menos um agente em uma mesa.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Copiar prompt/ })).toBeDisabled()

  await page.getByLabel('Nome do time').fill('Time de Pesquisa')
  await page.getByLabel('Objetivo do time').fill('Responder perguntas com fonte.')
  await page.getByRole('button', { name: 'Sentar no time: Ana' }).click()

  await expect(page.getByRole('button', { name: /Copiar prompt/ })).toBeEnabled()
})

test('leaves an empty chair when an agent is deleted from the library', async ({ page }) => {
  await seed(page)
  await page.goto('/#/times/new')

  await page.getByLabel('Nome do time').fill('Time de Conteúdo')
  await page.getByRole('button', { name: 'Sentar no time: Ana' }).click()
  await (await openOrder(page, 'Ana', /Ordem para este agente/)).fill('Levantar cinco estudos.')

  const url = page.url()
  await page.goto('/#/studio')
  await page.getByRole('button', { name: 'Excluir: Ana' }).click()
  await page.getByRole('button', { name: 'Excluir', exact: true }).click()

  await page.goto(url)

  // The seat stays: pruning it would delete the order that was written for it.
  await expect(page.locator('.desk[data-missing="true"]')).toBeVisible()
  await expect(page.getByText('Este agente foi excluído deste navegador.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remover mesa vazia' })).toBeVisible()
})

test('holds the roster at its ceiling and explains the limit', async ({ page }) => {
  const many = Array.from({ length: TEAM_LIMITS.maxMembers + 1 }, (_, i) =>
    agent(`seed-${i}`, `Agente ${i}`, 'Fazer alguma coisa.', `2026-08-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`)
  )
  await page.addInitScript((agents) => {
    localStorage.setItem('agent-studio:agents', JSON.stringify(agents))
  }, many)

  await page.goto('/#/times/new')
  await page.getByLabel('Nome do time').fill('Time grande')

  for (let i = 0; i < TEAM_LIMITS.maxMembers; i += 1) {
    await page.getByRole('button', { name: `Sentar no time: Agente ${i}` }).click()
  }

  await expect(page.locator('.desk')).toHaveCount(TEAM_LIMITS.maxMembers)
  await expect(page.getByText(`O time está cheio (${TEAM_LIMITS.maxMembers} agentes).`)).toBeVisible()

  // The button stays operable and says why, rather than swallowing the click.
  await page.getByRole('button', { name: `Sentar no time: Agente ${TEAM_LIMITS.maxMembers}` }).click()
  await expect(page.locator('.desk')).toHaveCount(TEAM_LIMITS.maxMembers)
})
