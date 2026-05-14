import { countries } from '../src/data/countries.js'
import { countryPositions } from '../src/data/countryPositions.js'

const requiredFields = ['name', 'capital', 'continent', 'geography', 'mnemonic']
const validContinents = ['Europe', 'Afrique', 'Asie', 'Amérique', 'Océanie']

function getPositionKey(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

const errors = []
const seenCountries = new Set()

for (const country of countries) {
  for (const field of requiredFields) {
    if (!country[field]) {
      errors.push(`${country.name || 'Pays sans nom'} : champ manquant ${field}`)
    }
  }

  const countryKey = getPositionKey(country.name)

  if (seenCountries.has(countryKey)) {
    errors.push(`${country.name} : doublon détecté`)
  }

  seenCountries.add(countryKey)

  if (!validContinents.includes(country.continent)) {
    errors.push(`${country.name} : continent invalide ${country.continent}`)
  }

  if (!countryPositions[countryKey]) {
    errors.push(`${country.name} : position manquante`)
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Données vérifiées : ${countries.length} pays, aucun problème détecté.`)
