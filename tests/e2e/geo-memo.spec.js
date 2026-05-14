import { devices, expect, test } from '@playwright/test'
import {
  expectNoClientErrors,
  openHome,
  openModule,
  screenshot,
  selectQuizContinent,
  selectQuizType,
  waitForMapReady,
} from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
  })
})

test('chargement application', async ({ page }) => {
  await expectNoClientErrors(page, async () => {
    await openHome(page)

    await expect(page.getByText(/MNÉMOTECHNIQUE|MNEMONIC/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Carte|Map/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Apprendre|Learn/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Quiz/i })).toBeVisible()
    await screenshot(page, 'home-loaded')
  })
})

test('changement langue FR -> EN -> FR', async ({ page }) => {
  await openHome(page)

  await expect(page.getByText('Explore, mémorise et défie ta carte du monde.')).toBeVisible()

  await page.getByRole('button', { name: /Changer la langue/i }).click()
  await expect(page.getByText('Explore, memorize, and challenge your world map.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Learn/i })).toBeVisible()

  await openModule(page, /Quiz/i)
  await expect(page.getByLabel(/Quiz type/i)).toBeVisible()

  await page.getByRole('button', { name: /Back home/i }).click()
  await page.getByRole('button', { name: /Change language/i }).click()

  await expect(page.getByText('Explore, mémorise et défie ta carte du monde.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Apprendre/i })).toBeVisible()
})

test('quiz Europe carte', async ({ page }) => {
  await openHome(page)
  await openModule(page, /Quiz/i)

  await selectQuizType(page, 'Trouver le pays sur la carte + territoires')
  await selectQuizContinent(page, 'Europe')
  await page.getByRole('button', { name: /Démarrer le quiz carte/i }).click()

  await expect(page.locator('.quiz-map-fullscreen')).toBeVisible()
  await waitForMapReady(page, '.quiz-shape-map.leaflet-container')
  await expect(
    page.locator('.quiz-map-question').getByText(/Où se trouve/i),
  ).toBeVisible()
  await expect(
    page.locator('.quiz-map-stat').filter({ hasText: /Restants/i }),
  ).toBeVisible()
})

test('quiz Océanie centré avec marqueurs visibles', async ({ page }) => {
  await openHome(page)
  await openModule(page, /Quiz/i)

  await selectQuizType(page, 'Trouver le pays sur la carte + territoires')
  await selectQuizContinent(page, 'Océanie')
  await page.getByRole('button', { name: /Démarrer le quiz carte/i }).click()

  const map = page.locator('.quiz-shape-map.leaflet-container')
  await waitForMapReady(page, '.quiz-shape-map.leaflet-container')
  await expect(
    page.locator('.quiz-map-fullscreen svg path.leaflet-interactive').first(),
  ).toBeVisible()

  await page.waitForTimeout(1_200)
  const initialTransform = await page
    .locator('.quiz-shape-map .leaflet-map-pane')
    .evaluate((element) => element.style.transform)
  await page.waitForTimeout(900)
  const settledTransform = await page
    .locator('.quiz-shape-map .leaflet-map-pane')
    .evaluate((element) => element.style.transform)
  expect(settledTransform).toBe(initialTransform)

  const markerCenterRatio = await map.evaluate((container) => {
    const containerBox = container.getBoundingClientRect()
    const markers = [...container.querySelectorAll('svg path.leaflet-interactive')]
      .map((marker) => marker.getBoundingClientRect())
      .filter((box) => box.width > 0 && box.height > 0)

    const averageX =
      markers.reduce((sum, box) => sum + box.left + box.width / 2, 0) /
      markers.length

    return (averageX - containerBox.left) / containerBox.width
  })

  expect(markerCenterRatio).toBeGreaterThan(0.2)
  expect(markerCenterRatio).toBeLessThan(0.85)
})

test('quiz carte reconnaît Gibraltar comme bonne réponse', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.9202
  })

  await openHome(page)
  await openModule(page, /Quiz/i)

  await selectQuizType(page, 'Trouver le pays sur la carte + territoires')
  await selectQuizContinent(page, 'Europe')
  await expect(page.getByText(/Gibraltar/)).toBeVisible()
  await page.getByRole('button', { name: /Démarrer le quiz carte/i }).click()

  await waitForMapReady(page, '.quiz-shape-map.leaflet-container')

  const gibraltarShape = page
    .locator('.quiz-map-fullscreen path[data-map-node-id="territory:gibraltar-royaume-uni"]')
    .first()

  const box = await gibraltarShape.boundingBox()

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

  await expect(
    page.locator('.quiz-map-learning-card .eyebrow'),
  ).toBeVisible()
  await expect(
    page.getByText(/0 pays \/ 1 territoires|0 countries \/ 1 territories/i),
  ).toBeVisible()
})

test('couleurs différentes pour pays voisins en Europe', async ({ page }) => {
  await openHome(page)
  await openModule(page, /Carte|Map/i)
  await waitForMapReady(page, '.world-map.leaflet-container')

  const colors = await page.locator('.world-map').evaluate((mapElement) => {
    const countryIds = [
      'belgique',
      'allemagne',
      'france',
      'espagne',
      'italie',
      'pologne',
      'suisse',
      'autriche',
      'pays-bas',
    ]

    return Object.fromEntries(
      countryIds.map((countryId) => {
        const shape = mapElement.querySelector(
          `path[data-map-node-id="country:${countryId}"]`,
        )

        return [countryId, shape?.getAttribute('fill') || '']
      }),
    )
  })

  expect(colors.belgique).toBeTruthy()
  expect(colors.allemagne).toBeTruthy()
  expect(colors.france).toBeTruthy()
  expect(colors.espagne).toBeTruthy()
  expect(colors.italie).toBeTruthy()
  expect(colors.pologne).toBeTruthy()
  expect(colors.suisse).toBeTruthy()
  expect(colors.autriche).toBeTruthy()
  expect(colors['pays-bas']).toBeTruthy()

  expect(colors.allemagne).not.toBe(colors.belgique)
  expect(colors.allemagne).not.toBe(colors['pays-bas'])
  expect(colors.allemagne).not.toBe(colors.pologne)
  expect(colors.allemagne).not.toBe(colors.france)
  expect(colors.allemagne).not.toBe(colors.suisse)
  expect(colors.allemagne).not.toBe(colors.autriche)
  expect(colors.france).not.toBe(colors.belgique)
  expect(colors.france).not.toBe(colors.espagne)
  expect(colors.france).not.toBe(colors.italie)
})

test('clic sur petites zones après fort zoom', async ({ page }) => {
  await openHome(page)
  await openModule(page, /Carte|Map/i)
  await waitForMapReady(page, '.world-map.leaflet-container')

  async function zoomAndClickShape(mapNodeId, expectedHeading) {
    const shape = page.locator(`.world-map path[data-map-node-id="${mapNodeId}"]`).first()

    await expect(shape).toBeVisible()

    const initialBox = await shape.boundingBox()

    await page.mouse.move(
      initialBox.x + initialBox.width / 2,
      initialBox.y + initialBox.height / 2,
    )

    for (let zoomStep = 0; zoomStep < 3; zoomStep += 1) {
      await page.mouse.wheel(0, -600)
      await page.waitForTimeout(120)
    }

    const zoomedBox = await shape.boundingBox()

    await page.mouse.click(
      zoomedBox.x + zoomedBox.width / 2,
      zoomedBox.y + zoomedBox.height / 2,
    )

    try {
      await expect(page.locator('.map-info-panel h3')).toHaveText(expectedHeading, {
        timeout: 3_000,
      })
    } catch {
      await shape.click({ force: true })
      await expect(page.locator('.map-info-panel h3')).toHaveText(expectedHeading)
    }
  }

  await zoomAndClickShape('country:kosovo', 'Kosovo')

  await page.locator('.map-toolbar select').first().selectOption('Afrique')
  await waitForMapReady(page, '.world-map.leaflet-container')
  await zoomAndClickShape('country:djibouti', 'Djibouti')
})

test('quiz image', async ({ page }) => {
  await page.route('https://**/*', async (route) => {
    if (route.request().resourceType() === 'image') {
      await route.fulfill({
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
          'base64',
        ),
        contentType: 'image/png',
      })
      return
    }

    await route.continue()
  })

  await openHome(page)
  await openModule(page, /Quiz/i)

  await selectQuizType(page, 'Trouver le pays avec une image')

  await expect(page.locator('.quiz-image')).toBeVisible()
  await expect(page.getByText(/Images réussies/i)).toBeVisible()
  await expect(page.getByText(/Images restantes/i)).toBeVisible()

  await page.locator('.answer-grid button').first().click()

  const nextButton = page.getByRole('button', { name: /Question suivante/i })
  await expect(nextButton).toBeVisible()
  await expect(nextButton).toBeInViewport()
})

test('drapeaux visibles sur fond clair', async ({ page }) => {
  await openHome(page)
  await openModule(page, /Quiz/i)
  await selectQuizType(page, 'Trouver le pays avec son drapeau')

  const flagFrame = page.locator('.flag-visual .country-flag').first()

  await expect(flagFrame).toBeVisible()

  const flagStyles = await flagFrame.evaluate((element) => {
    const styles = window.getComputedStyle(element)

    return {
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      borderStyle: styles.borderStyle,
      borderWidth: styles.borderWidth,
      boxShadow: styles.boxShadow,
    }
  })

  expect(flagStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
  expect(flagStyles.borderStyle).toBe('solid')
  expect(flagStyles.borderWidth).not.toBe('0px')
  expect(flagStyles.borderColor).not.toBe('rgba(0, 0, 0, 0)')
  expect(flagStyles.boxShadow).not.toBe('none')
})

test.describe('mobile iPhone 13', () => {
  const iphone13 = devices['iPhone 13']

  test.use({
    deviceScaleFactor: iphone13.deviceScaleFactor,
    hasTouch: iphone13.hasTouch,
    userAgent: iphone13.userAgent,
    viewport: iphone13.viewport,
  })

  async function expectNoHorizontalOverflow(page) {
    const hasHorizontalOverflow = await page.evaluate(() => {
      const documentElement = document.documentElement

      return documentElement.scrollWidth > documentElement.clientWidth + 1
    })

    expect(hasHorizontalOverflow).toBe(false)
  }

  test('accueil visible sur iPhone', async ({ page }) => {
    await openHome(page)

    await expect(page.getByRole('heading', { name: /Geo M.mo/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Carte|Map/i })).toBeInViewport()
    await expect(page.getByRole('button', { name: /Quiz/i })).toBeInViewport()
    await expectNoHorizontalOverflow(page)
  })

  test('quiz image utilisable sur iPhone', async ({ page }) => {
    await page.route('https://**/*', async (route) => {
      if (route.request().resourceType() === 'image') {
        await route.fulfill({
          body: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
            'base64',
          ),
          contentType: 'image/png',
        })
        return
      }

      await route.continue()
    })

    await openHome(page)
    await openModule(page, /Quiz/i)
    await selectQuizType(page, 'Trouver le pays avec une image')

    await expect(page.locator('.quiz-image')).toBeVisible()
    await page.locator('.answer-grid button').first().click()

    const nextButton = page.getByRole('button', { name: /Question suivante/i })

    await expect(nextButton).toBeVisible()
    await expect(nextButton).toBeInViewport()
    await expectNoHorizontalOverflow(page)
  })

  test('quiz carte Océanie visible sur iPhone', async ({ page }) => {
    await openHome(page)
    await openModule(page, /Quiz/i)

    await selectQuizType(page, 'Trouver le pays sur la carte + territoires')
    await page.locator('.quiz-controls select').nth(1).selectOption({ index: 5 })
    await page.getByRole('button', { name: /D.marrer le quiz carte/i }).click()

    const map = page.locator('.quiz-shape-map.leaflet-container')

    await waitForMapReady(page, '.quiz-shape-map.leaflet-container')
    await expect(page.locator('.quiz-map-fullscreen')).toBeVisible()
    await expect(page.locator('.quiz-map-hud')).toBeInViewport()
    await expect(
      page.locator('.quiz-map-fullscreen svg path.leaflet-interactive').first(),
    ).toBeVisible()

    const mapBox = await map.boundingBox()
    const viewport = page.viewportSize()

    expect(mapBox.height).toBeGreaterThan((viewport?.height || 0) - 8)
    await expectNoHorizontalOverflow(page)
  })
})
