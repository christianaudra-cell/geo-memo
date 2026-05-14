import { expect } from '@playwright/test'

export async function screenshot(page, name) {
  await page.screenshot({
    fullPage: true,
    path: `test-results/manual-${name}.png`,
  })
}

export async function waitForMapReady(page, selector = '.leaflet-container') {
  const map = page.locator(selector).first()

  await expect(map).toBeVisible()
  await page.waitForFunction((mapSelector) => {
    const container = document.querySelector(mapSelector)

    if (!container) {
      return false
    }

    return Boolean(
      container.querySelector('svg path, svg circle, .leaflet-marker-icon'),
    )
  }, selector)
}

export async function expectNoClientErrors(page, run) {
  const errors = []

  page.on('pageerror', (error) => {
    errors.push(error.message)
  })
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })

  await run()
  expect(errors).toEqual([])
}

export async function openHome(page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Geo M.mo/i })).toBeVisible()
}

export async function openModule(page, name) {
  await page.getByRole('button', { name }).click()
}

export async function selectQuizType(page, label) {
  await page.getByLabel(/Type de quiz|Quiz type/i).selectOption({ label })
}

export async function selectQuizContinent(page, label) {
  await page
    .getByLabel(/Continent à réviser|Continent to review/i)
    .selectOption({ label })
}
