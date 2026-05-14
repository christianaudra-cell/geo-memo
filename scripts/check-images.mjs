import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { countryLandmarks } from '../src/data/countryLandmarks.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const requiredLandmarks = [
  'Colisée',
  'Mont Fuji',
  'Big Ben',
  'Parthénon',
  'Sainte-Sophie',
  'Statue de la Liberté',
  'Christ Rédempteur',
  'Chichén Itzá',
  'Cathédrale Saint-Basile',
]
const errors = []

function isRemoteImage(imagePath) {
  return /^https?:\/\//.test(imagePath)
}

function validateRemoteImage(imagePath, label) {
  try {
    const url = new URL(imagePath)

    if (!['http:', 'https:'].includes(url.protocol)) {
      errors.push(`${label} : protocole d'image non supporté ${url.protocol}`)
    }
  } catch {
    errors.push(`${label} : URL d'image invalide ${imagePath}`)
  }
}

function validateLocalImage(imagePath, label) {
  if (!imagePath.startsWith('/')) {
    errors.push(
      `${label} : chemin local invalide "${imagePath}" ; utiliser /images/quiz/nom-image.jpg`,
    )
    return
  }

  const publicFilePath = path.join(projectRoot, 'public', imagePath)

  if (!fs.existsSync(publicFilePath)) {
    errors.push(`${label} : fichier local introuvable ${publicFilePath}`)
  }
}

function validateImagePath(imagePath, label) {
  if (!imagePath || typeof imagePath !== 'string') {
    errors.push(`${label} : image manquante`)
    return
  }

  if (isRemoteImage(imagePath)) {
    validateRemoteImage(imagePath, label)
    return
  }

  validateLocalImage(imagePath, label)
}

for (const landmark of countryLandmarks) {
  const label = `${landmark.landmarkName} (${landmark.countryName})`

  if (!landmark.countryName) {
    errors.push(`${label} : pays manquant`)
  }

  if (!landmark.landmarkName) {
    errors.push(`${label} : nom du lieu manquant`)
  }

  validateImagePath(landmark.image, label)

  for (const fallbackImage of landmark.imageFallbacks || []) {
    validateImagePath(fallbackImage, `${label} fallback`)
  }
}

for (const requiredLandmark of requiredLandmarks) {
  if (
    !countryLandmarks.some(
      (landmark) => landmark.landmarkName === requiredLandmark,
    )
  ) {
    errors.push(`Entrée obligatoire absente : ${requiredLandmark}`)
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log('Images du quiz vérifiées :')
for (const landmark of countryLandmarks) {
  console.log(`- ${landmark.landmarkName} (${landmark.countryName}) -> ${landmark.image}`)
}
