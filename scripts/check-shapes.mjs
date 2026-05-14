import { feature } from 'topojson-client'
import countriesAtlas from 'world-atlas/countries-10m.json' with { type: 'json' }
import { countries } from '../src/data/countries.js'
import { countryShapeNames } from '../src/data/countryShapeNames.js'
import {
  dependentTerritories,
  territoryStatusLabels,
} from '../src/data/dependentTerritories.js'

const hiddenShapeNames = new Set(['Antarctica'])
const shapeNameAliases = {
  'Republic of the Congo': 'Congo',
  'Democratic Republic of the Congo': 'Dem. Rep. Congo',
  'Western Sahara': 'W. Sahara',
}
const hiddenOverseasBoundsByShapeName = {
  France: [
    { label: 'Guyane francaise', bounds: [-54.7, 2.0, -51.5, 5.9] },
    { label: 'Martinique', bounds: [-61.3, 14.3, -60.7, 15.0] },
    { label: 'Guadeloupe', bounds: [-61.9, 15.8, -60.9, 16.6] },
    { label: 'La Reunion', bounds: [55.1, -21.5, 56.0, -20.7] },
    { label: 'Mayotte', bounds: [44.9, -13.1, 45.4, -12.5] },
  ],
  Netherlands: [
    { label: 'Bonaire', bounds: [-68.5, 11.9, -68.1, 12.4] },
    { label: 'Sint Eustatius', bounds: [-63.1, 17.4, -62.9, 17.6] },
    { label: 'Saba', bounds: [-63.3, 17.5, -63.1, 17.7] },
  ],
}
const caribbeanCountries = [
  'Antigua-et-Barbuda',
  'Bahamas',
  'Barbade',
  'Cuba',
  'Dominique',
  'Grenade',
  'Haïti',
  'Jamaïque',
  'République dominicaine',
  'Saint-Christophe-et-Niévès',
  'Sainte-Lucie',
  'Saint-Vincent-et-les-Grenadines',
  'Trinité-et-Tobago',
]
const expectedMaskedCaribbeanTerritories = [
  'Anguilla',
  'Aruba',
  'British Virgin Is.',
  'Cayman Is.',
  'Curaçao',
  'Montserrat',
  'Puerto Rico',
  'Sint Maarten',
  'St-Martin',
  'St-Barthélemy',
  'Turks and Caicos Is.',
  'U.S. Virgin Is.',
]

const countryFeatures = feature(
  countriesAtlas,
  countriesAtlas.objects.countries,
).features.filter((countryFeature) => !hiddenShapeNames.has(countryFeature.properties.name))

function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function getMappedShapeNames(country) {
  const mappedShapeNames = countryShapeNames[country.name]

  if (!mappedShapeNames) {
    return [country.name]
  }

  return Array.isArray(mappedShapeNames) ? mappedShapeNames : [mappedShapeNames]
}

function getRingBounds(ring) {
  const longitudes = ring.map((coordinates) => coordinates[0])
  const latitudes = ring.map((coordinates) => coordinates[1])

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ]
}

function isInsideBounds(bounds, containerBounds) {
  return (
    bounds[0] >= containerBounds[0] &&
    bounds[1] >= containerBounds[1] &&
    bounds[2] <= containerBounds[2] &&
    bounds[3] <= containerBounds[3]
  )
}

const shapeNames = new Set(countryFeatures.map((countryFeature) => countryFeature.properties.name))
const shapeNameByNormalizedName = Object.fromEntries(
  countryFeatures.map((countryFeature) => [
    normalizeName(countryFeature.properties.name),
    countryFeature.properties.name,
  ]),
)

function resolveAtlasShapeName(shapeName) {
  const atlasShapeName = shapeNameAliases[shapeName] || shapeName

  if (shapeNames.has(atlasShapeName)) {
    return atlasShapeName
  }

  return shapeNameByNormalizedName[normalizeName(atlasShapeName)] || null
}

function resolveShapeNames(country) {
  const resolvedShapeNames = getMappedShapeNames(country)
    .map(resolveAtlasShapeName)
    .filter(Boolean)

  if (resolvedShapeNames.length > 0) {
    return resolvedShapeNames
  }

  return [shapeNameByNormalizedName[normalizeName(country.name)]].filter(Boolean)
}

function getCountryByShapeName(countryList) {
  return countryList.reduce((shapeMap, country) => {
    for (const shapeName of resolveShapeNames(country)) {
      shapeMap[shapeName] = country
    }

    return shapeMap
  }, {})
}

function getHiddenOverseasPolygons() {
  return Object.entries(hiddenOverseasBoundsByShapeName).flatMap(
    ([shapeName, hiddenBounds]) => {
      const countryFeature = countryFeatures.find(
        (featureItem) => featureItem.properties.name === shapeName,
      )

      if (!countryFeature || countryFeature.geometry.type !== 'MultiPolygon') {
        return []
      }

      return countryFeature.geometry.coordinates.flatMap((polygon, index) => {
        const polygonBounds = getRingBounds(polygon[0])
        const match = hiddenBounds.find(({ bounds }) =>
          isInsideBounds(polygonBounds, bounds),
        )

        if (!match) {
          return []
        }

        return [
          {
            index,
            label: match.label,
            shapeName,
            bounds: polygonBounds,
          },
        ]
      })
    },
  )
}

const countryByShapeName = getCountryByShapeName(countries)
const territoriesWithoutShape = dependentTerritories.filter((territory) => {
  if (territory.source) {
    return !countryFeatures.some(
      (countryFeature) => countryFeature.properties.name === territory.source.shapeName,
    )
  }

  return (territory.shapeNames || [])
    .map(resolveAtlasShapeName)
    .filter(Boolean).length === 0
})
const countriesWithoutShape = countries.filter(
  (country) => resolveShapeNames(country).length === 0,
)
const maskedTerritoryFeatures = countryFeatures.filter(
  (countryFeature) => !countryByShapeName[countryFeature.properties.name],
)
const hiddenOverseasPolygons = getHiddenOverseasPolygons()
const caribbeanCountryShapeNames = caribbeanCountries.map((countryName) => {
  const country = countries.find((countryItem) => countryItem.name === countryName)

  return {
    countryName,
    shapeNames: country ? resolveShapeNames(country) : [],
  }
})
const missingExpectedCaribbeanMasks = expectedMaskedCaribbeanTerritories.filter(
  (shapeName) =>
    !maskedTerritoryFeatures.some(
      (countryFeature) => countryFeature.properties.name === shapeName,
    ),
)
const statsByContinent = countries.reduce((stats, country) => {
  stats[country.continent] ||= { countries: 0, shapes: 0 }
  stats[country.continent].countries += 1
  stats[country.continent].shapes += resolveShapeNames(country).length

  return stats
}, {})
const renderedShapesByContinent = Object.fromEntries(
  Object.keys(statsByContinent).map((continent) => {
    const continentCountries = countries.filter((country) => country.continent === continent)
    const continentShapeNames = new Set(
      continentCountries.flatMap((country) => resolveShapeNames(country)),
    )

    return [continent, [...continentShapeNames].sort()]
  }),
)

if (countriesWithoutShape.length > 0) {
  console.error(
    'Pays Geo Memo sans forme:',
    countriesWithoutShape.map((country) => country.name).join(', '),
  )
  process.exitCode = 1
}

if (territoriesWithoutShape.length > 0) {
  console.error(
    'Territoires dependants sans forme:',
    territoriesWithoutShape.map((territory) => territory.label).join(', '),
  )
  process.exitCode = 1
}

console.log(`Pays Geo Memo colorables/cliquables : ${countries.length}`)
console.log(`Territoires dependants affichables : ${dependentTerritories.length}`)
console.log(`Features hors quiz masquees : ${maskedTerritoryFeatures.length}`)
console.log(`Sous-polygones dependants masques : ${hiddenOverseasPolygons.length}`)
console.log('Stats par continent :')

for (const [continent, stats] of Object.entries(statsByContinent)) {
  console.log(`- ${continent}: ${stats.countries} pays, ${stats.shapes} formes`)
}

console.log('Features rendues par continent :')

for (const [continent, shapeNames] of Object.entries(renderedShapesByContinent)) {
  console.log(`- ${continent}: ${shapeNames.join(', ')}`)
}

console.log('Features hors quiz masquees :')
console.log(maskedTerritoryFeatures.map((countryFeature) => countryFeature.properties.name).join(', '))

console.log('Territoires dependants disponibles :')
console.log(
  dependentTerritories
    .map(
      (territory) =>
        `${territory.label} - ${territoryStatusLabels[territory.politicalStatus]}`,
    )
    .join('\n'),
)

console.log('Pays independants des Caraibes valides :')
console.log(
  caribbeanCountryShapeNames
    .map(({ countryName, shapeNames }) => `${countryName} -> ${shapeNames.join(', ')}`)
    .join('\n'),
)

console.log('Territoires caraibes hors quiz masques :')
console.log(
  expectedMaskedCaribbeanTerritories
    .filter((shapeName) => !missingExpectedCaribbeanMasks.includes(shapeName))
    .join(', '),
)

if (missingExpectedCaribbeanMasks.length > 0) {
  console.log('Territoires caraibes absents de world-atlas ou inclus dans un pays masque :')
  console.log(missingExpectedCaribbeanMasks.join(', '))
}

console.log('Sous-polygones masques :')
console.log(
  hiddenOverseasPolygons
    .map(
      (polygon) =>
        `${polygon.shapeName} polygon ${polygon.index} (${polygon.label}) [${polygon.bounds
          .map((coordinate) => coordinate.toFixed(3))
          .join(', ')}]`,
    )
    .join('\n'),
)
