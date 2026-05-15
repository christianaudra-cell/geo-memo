import { Fragment, useEffect, useMemo } from 'react'
import { CircleMarker, GeoJSON, Pane, useMap, useMapEvents } from 'react-leaflet'
import { feature } from 'topojson-client'
import countriesAtlas from 'world-atlas/countries-10m.json'
import { countryShapeNames } from '../data/countryShapeNames'
import {
  dependentTerritories,
  territoryStatusLabels,
} from '../data/dependentTerritories'
import { isOceaniaPlayableId } from '../data/oceaniaPlayableIds'

const countryFeatures = feature(
  countriesAtlas,
  countriesAtlas.objects.countries,
).features
const MAX_VISIBLE_LONGITUDE_JUMP = 180
const OCEANIA_MIN_DISPLAY_LONGITUDE = 120
const hiddenShapeNames = new Set(['Antarctica'])
const hiddenOverseasBoundsByShapeName = {
  France: [
    [-54.7, 2.0, -51.5, 5.9], // French Guiana
    [-61.3, 14.3, -60.7, 15.0], // Martinique
    [-61.9, 15.8, -60.9, 16.6], // Guadeloupe
    [55.1, -21.5, 56.0, -20.7], // Reunion
    [44.9, -13.1, 45.4, -12.5], // Mayotte
  ],
  Netherlands: [
    [-68.5, 11.9, -68.1, 12.4], // Bonaire
    [-63.1, 17.4, -62.9, 17.6], // Sint Eustatius
    [-63.3, 17.5, -63.1, 17.7], // Saba
  ],
}
const smallClickableTerritoryIds = new Set([
  'aruba-pays-bas',
  'curacao-pays-bas',
  'bonaire-pays-bas',
  'martinique-france',
  'guadeloupe-france',
  'la-reunion-france',
  'mayotte-france',
  'porto-rico-etats-unis',
  'bermudes-royaume-uni',
  'gibraltar-royaume-uni',
  'ile-de-man-couronne-britannique',
  'jersey-couronne-britannique',
  'guernesey-couronne-britannique',
  'guam-etats-unis',
  'polynesie-francaise-france',
  'iles-cook-nouvelle-zelande',
  'nouvelle-caledonie-france',
  'wallis-et-futuna-france',
  'samoa-etats-unis',
])
const OCEANIA_TERRITORY_MARKER_POSITION_OVERRIDES = {
  'iles-cook-nouvelle-zelande': [-21.2367, 200.2223],
  'wallis-et-futuna-france': [-13.7687, 183.8439],
}
const OCEANIA_DECORATIVE_ARCHIPELAGO_OFFSETS = {
  'iles-cook-nouvelle-zelande': [
    { lat: -0.18, lng: -0.24, radius: 3 },
    { lat: 0.02, lng: 0.12, radius: 4 },
    { lat: 0.2, lng: 0.32, radius: 2.6 },
  ],
  'wallis-et-futuna-france': [
    { lat: -0.12, lng: -0.18, radius: 3.2 },
    { lat: 0.08, lng: 0.08, radius: 4 },
    { lat: 0.22, lng: 0.24, radius: 2.8 },
  ],
}
function isIndependentCountryTerritory(territory) {
  return territory?.politicalStatus === 'independent'
}
const SMALL_EUROPE_COUNTRY_MARKERS = {
  vatican: { name: 'Vatican', lat: 41.9029, lng: 12.4534 },
  monaco: { name: 'Monaco', lat: 43.7384, lng: 7.4246 },
  'saint-marin': { name: 'Saint-Marin', lat: 43.9424, lng: 12.4578 },
  liechtenstein: { name: 'Liechtenstein', lat: 47.166, lng: 9.5554 },
  andorre: { name: 'Andorre', lat: 42.5063, lng: 1.5218 },
  malte: { name: 'Malte', lat: 35.9375, lng: 14.3754 },
}
const SMALL_OCEANIA_COUNTRY_MARKERS = {
  fidji: { name: 'Fidji', lat: -17.7134, lng: 178.065 },
  kiribati: { name: 'Kiribati', lat: 1.8709, lng: -157.363 },
  'iles-salomon': { name: 'Îles Salomon', lat: -9.6457, lng: 160.1562 },
  tonga: { name: 'Tonga', lat: -21.179, lng: -175.1982 },
  samoa: { name: 'Samoa', lat: -13.759, lng: -172.1046 },
  vanuatu: { name: 'Vanuatu', lat: -15.3767, lng: 166.9592 },
  tuvalu: { name: 'Tuvalu', lat: -7.1095, lng: 177.6493 },
  nauru: { name: 'Nauru', lat: -0.5228, lng: 166.9315 },
  palaos: { name: 'Palaos', lat: 7.515, lng: 134.5825 },
  micronesie: { name: 'Micronésie', lat: 7.4256, lng: 150.5508 },
  'iles-marshall': { name: 'Îles Marshall', lat: 7.1315, lng: 171.1845 },
}
const SMALL_COUNTRY_MARKERS = {
  ...SMALL_EUROPE_COUNTRY_MARKERS,
  ...SMALL_OCEANIA_COUNTRY_MARKERS,
}
const MAP_COLORS = [
  '#ffe08a',
  '#f7a8c7',
  '#93c5fd',
  '#9be7c1',
  '#ffd1a8',
  '#cbb7ff',
  '#78ddd4',
  '#c7ea7c',
  '#ffc078',
  '#f0abfc',
]
const OCEANIA_MARKER_COUNTRY_COLORS = [
  '#ffe08a',
  '#f7a8c7',
  '#cbb7ff',
  '#ffc078',
  '#93c5fd',
  '#ffd1a8',
  '#f0abfc',
  '#fca5a5',
]
const COUNTRY_BORDER_COLOR = '#4f6f67'
const COUNTRY_PATH_STYLE = {
  className: 'country-shape',
  lineCap: 'round',
  lineJoin: 'round',
  pointerEvents: 'auto',
}
const MARINE_OUTLINE_STYLE = {
  color: '#9fd0e7',
  fill: false,
  fillOpacity: 0,
  interactive: false,
  opacity: 0.82,
  pointerEvents: 'none',
  weight: 4.5,
}
const COUNTRY_VALIDATED_STYLE = {
  ...COUNTRY_PATH_STYLE,
  color: '#14532d',
  fillColor: '#22c55e',
  fillOpacity: 0.94,
  opacity: 1,
  weight: 1.8,
}
const COUNTRY_REVIEW_STYLE = {
  ...COUNTRY_PATH_STYLE,
  color: '#92400e',
  fillColor: '#facc15',
  fillOpacity: 0.8,
  opacity: 0.9,
  weight: 1,
}
const GUIDED_REFERENCE_HALO_STYLE = {
  ...COUNTRY_PATH_STYLE,
  color: '#f59e0b',
  fillColor: '#fbbf24',
  fillOpacity: 0.14,
  opacity: 0.75,
  pointerEvents: 'none',
  weight: 3,
}
const QUIZ_TARGET_FILL_COLOR = '#9333ea'
const QUIZ_TARGET_STROKE_COLOR = '#4c1d95'

function getQuizTargetCountryStyle(isMobile) {
  return {
    ...COUNTRY_PATH_STYLE,
    color: QUIZ_TARGET_STROKE_COLOR,
    fillColor: QUIZ_TARGET_FILL_COLOR,
    fillOpacity: isMobile ? 0.85 : 0.75,
    opacity: 1,
    weight: isMobile ? 4 : 3,
  }
}

function getQuizTargetTerritoryStyle(isMobile) {
  return {
    ...COUNTRY_PATH_STYLE,
    color: QUIZ_TARGET_STROKE_COLOR,
    fillColor: QUIZ_TARGET_FILL_COLOR,
    fillOpacity: isMobile ? 0.85 : 0.75,
    opacity: 1,
    weight: isMobile ? 4 : 3,
  }
}

function isQuizCountryTarget(country, currentQuestion) {
  return (
    currentQuestion?.type === 'country' &&
    getCountryId(country) === getCountryId(currentQuestion)
  )
}

function isQuizTerritoryTarget(territory, currentQuestion) {
  if (!currentQuestion || currentQuestion.type !== 'territory' || !territory) {
    return false
  }

  return (
    getCanonicalTerritoryId(territory) ===
    getCanonicalTerritoryId(currentQuestion)
  )
}

const TERRITORY_BASE_STYLE = {
  ...COUNTRY_PATH_STYLE,
  color: '#7c3aed',
  fillColor: '#f8c8a8',
  fillOpacity: 0.54,
  pointerEvents: 'auto',
  weight: 1.4,
  dashArray: '4 5',
}
const TERRITORY_VALIDATED_STYLE = {
  ...COUNTRY_PATH_STYLE,
  color: '#9a3412',
  fillColor: '#f97316',
  fillOpacity: 0.94,
  pointerEvents: 'auto',
  weight: 2.2,
}

function getCoordinateKey(coordinates) {
  return `${Number(coordinates[0]).toFixed(5)},${Number(coordinates[1]).toFixed(5)}`
}

function getSegmentKey(firstCoordinates, secondCoordinates) {
  const firstKey = getCoordinateKey(firstCoordinates)
  const secondKey = getCoordinateKey(secondCoordinates)

  return firstKey < secondKey
    ? `${firstKey}|${secondKey}`
    : `${secondKey}|${firstKey}`
}

function getGeometryRings(geometry) {
  if (!geometry) {
    return []
  }

  if (geometry.type === 'Polygon') {
    return geometry.coordinates
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((polygon) => polygon)
  }

  return []
}

function getFeatureCountryId(shapeFeature) {
  return shapeFeature?.properties?.countryId || shapeFeature?.properties?.id
}

function getCountryMapNodeId(country) {
  return `country:${getCountryId(country)}`
}

function getTerritoryMapNodeId(territory) {
  return `territory:${territory?.id}`
}

function getFeatureMapNodeId(shapeFeature) {
  if (shapeFeature?.properties?.mapNodeId) {
    return shapeFeature.properties.mapNodeId
  }

  if (shapeFeature?.properties?.territoryId) {
    return `territory:${shapeFeature.properties.territoryId}`
  }

  const countryId = getFeatureCountryId(shapeFeature)

  return countryId ? `country:${countryId}` : null
}

function getMapNodeStableKey(mapNodeId) {
  return String(mapNodeId || '').replace(/^(country|territory):/, '')
}

function getStableColorRank(mapNodeId, color) {
  const stableKey = getMapNodeStableKey(mapNodeId)
  const colorSeed = [...`${stableKey}-${color}`].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  )

  return colorSeed
}

function getPreferredColors(mapNodeId) {
  return [...MAP_COLORS].sort(
    (firstColor, secondColor) =>
      getStableColorRank(mapNodeId, firstColor) -
      getStableColorRank(mapNodeId, secondColor),
  )
}

const MANUAL_EUROPE_ADJACENCY = [
  ['allemagne', 'belgique'],
  ['allemagne', 'pays-bas'],
  ['allemagne', 'pologne'],
  ['allemagne', 'france'],
  ['allemagne', 'suisse'],
  ['allemagne', 'autriche'],
  ['france', 'belgique'],
  ['france', 'espagne'],
  ['france', 'italie'],
  ['france', 'suisse'],
  ['france', 'pays-bas'],
  ['belgique', 'pays-bas'],
  ['belgique', 'luxembourg'],
  ['belgique', 'france'],
  ['pays-bas', 'allemagne'],
  ['pologne', 'allemagne'],
  ['suisse', 'italie'],
  ['suisse', 'autriche'],
  ['suisse', 'france'],
  ['autriche', 'italie'],
  ['autriche', 'slovenie'],
  ['espagne', 'portugal'],
]

function addAdjacencyEdge(adjacency, firstNodeId, secondNodeId) {
  if (firstNodeId === secondNodeId) {
    return
  }

  adjacency[firstNodeId] ||= new Set()
  adjacency[secondNodeId] ||= new Set()
  adjacency[firstNodeId].add(secondNodeId)
  adjacency[secondNodeId].add(firstNodeId)
}

function addManualEuropeAdjacency(adjacency) {
  for (const [firstCountryId, secondCountryId] of MANUAL_EUROPE_ADJACENCY) {
    const firstNodeId = `country:${firstCountryId}`
    const secondNodeId = `country:${secondCountryId}`

    if (!adjacency[firstNodeId] && !adjacency[secondNodeId]) {
      continue
    }

    addAdjacencyEdge(adjacency, firstNodeId, secondNodeId)
  }
}

function getAreaAdjacency(shapeFeatures) {
  const adjacency = {}
  const nodeIdsBySegment = new Map()

  for (const shapeFeature of shapeFeatures) {
    const nodeId = getFeatureMapNodeId(shapeFeature)

    if (!nodeId) {
      continue
    }

    adjacency[nodeId] ||= new Set()

    for (const ring of getGeometryRings(shapeFeature.geometry)) {
      for (let index = 1; index < ring.length; index += 1) {
        const segmentKey = getSegmentKey(ring[index - 1], ring[index])

        if (!nodeIdsBySegment.has(segmentKey)) {
          nodeIdsBySegment.set(segmentKey, new Set())
        }

        nodeIdsBySegment.get(segmentKey).add(nodeId)
      }
    }
  }

  for (const nodeIds of nodeIdsBySegment.values()) {
    const uniqueNodeIds = [...nodeIds]

    if (uniqueNodeIds.length < 2) {
      continue
    }

    for (let firstIndex = 0; firstIndex < uniqueNodeIds.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < uniqueNodeIds.length;
        secondIndex += 1
      ) {
        const firstNodeId = uniqueNodeIds[firstIndex]
        const secondNodeId = uniqueNodeIds[secondIndex]

        if (firstNodeId === secondNodeId) {
          continue
        }

        addAdjacencyEdge(adjacency, firstNodeId, secondNodeId)
      }
    }
  }

  addManualEuropeAdjacency(adjacency)

  return adjacency
}

function getNextAreaToColor(nodeIds, adjacency, colorByNodeId) {
  return nodeIds
    .filter((nodeId) => !colorByNodeId[nodeId])
    .sort((firstNodeId, secondNodeId) => {
      const firstNeighbors = adjacency[firstNodeId] || new Set()
      const secondNeighbors = adjacency[secondNodeId] || new Set()
      const firstNeighborColors = new Set(
        [...firstNeighbors].map((neighborId) => colorByNodeId[neighborId]).filter(Boolean),
      )
      const secondNeighborColors = new Set(
        [...secondNeighbors].map((neighborId) => colorByNodeId[neighborId]).filter(Boolean),
      )

      return (
        secondNeighborColors.size - firstNeighborColors.size ||
        secondNeighbors.size - firstNeighbors.size ||
        firstNodeId.localeCompare(secondNodeId)
      )
    })[0]
}

function canUseColor(nodeId, color, adjacency, colorByNodeId) {
  return ![...(adjacency[nodeId] || [])].some(
    (neighborId) => colorByNodeId[neighborId] === color,
  )
}

function colorAreaGraph(adjacency) {
  const nodeIds = Object.keys(adjacency).sort(
    (firstNodeId, secondNodeId) =>
      (adjacency[secondNodeId]?.size || 0) -
        (adjacency[firstNodeId]?.size || 0) ||
      firstNodeId.localeCompare(secondNodeId),
  )
  const colorByNodeId = {}

  function assignColor() {
    const nodeId = getNextAreaToColor(nodeIds, adjacency, colorByNodeId)

    if (!nodeId) {
      return true
    }

    for (const color of getPreferredColors(nodeId)) {
      if (!canUseColor(nodeId, color, adjacency, colorByNodeId)) {
        continue
      }

      colorByNodeId[nodeId] = color

      if (assignColor()) {
        return true
      }

      delete colorByNodeId[nodeId]
    }

    return false
  }

  assignColor()

  return colorByNodeId
}

function getAreaColorMap(shapeFeatures) {
  return colorAreaGraph(getAreaAdjacency(shapeFeatures))
}

function getAreaColor(mapNodeId, areaColorById) {
  return (
    areaColorById?.[mapNodeId] ||
    getPreferredColors(mapNodeId)[0] ||
    MAP_COLORS[0]
  )
}

function getStablePaletteColor(value, palette) {
  const stableKey = getStableId(value)
  const colorIndex = [...stableKey].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  ) % palette.length

  return palette[colorIndex]
}

function getOceaniaCountryMarkerColor(country) {
  return getStablePaletteColor(
    getCountryId(country) || country?.name,
    OCEANIA_MARKER_COUNTRY_COLORS,
  )
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

function isOverseasPolygonToHide(countryFeature, polygon) {
  const hiddenBounds = hiddenOverseasBoundsByShapeName[countryFeature.properties.name]

  if (!hiddenBounds) {
    return false
  }

  const polygonBounds = getRingBounds(polygon[0])

  return hiddenBounds.some((bounds) =>
    isInsideBounds(polygonBounds, bounds),
  )
}

function hasAntimeridianJump(ring) {
  return ring.some((coordinates, index) => {
    if (index === 0) {
      return false
    }

    return Math.abs(coordinates[0] - ring[index - 1][0]) > MAX_VISIBLE_LONGITUDE_JUMP
  })
}

function getRingSegmentsWithoutJumps(ring) {
  const segments = []
  let currentSegment = []

  for (const coordinates of ring) {
    const previousCoordinates = currentSegment[currentSegment.length - 1]

    if (
      previousCoordinates &&
      Math.abs(coordinates[0] - previousCoordinates[0]) >
        MAX_VISIBLE_LONGITUDE_JUMP
    ) {
      if (currentSegment.length >= 3) {
        segments.push([...currentSegment, currentSegment[0]])
      }

      currentSegment = [coordinates]
      continue
    }

    currentSegment.push(coordinates)
  }

  if (currentSegment.length >= 3) {
    segments.push([...currentSegment, currentSegment[0]])
  }

  return segments.filter((segment) => segment.length >= 4)
}

function cleanPolygon(polygon) {
  const cleanedRings = polygon.filter((ring) => !hasAntimeridianJump(ring))

  if (cleanedRings.length > 0) {
    return cleanedRings
  }

  return polygon.flatMap(getRingSegmentsWithoutJumps)
}

function cleanGeometry(geometry) {
  if (!geometry) {
    return geometry
  }

  if (geometry.type === 'Polygon') {
    const coords = cleanPolygon(geometry.coordinates)

    return coords.length > 0 ? { ...geometry, coordinates: coords } : null
  }

  if (geometry.type === 'MultiPolygon') {
    const coords = geometry.coordinates
      .map(cleanPolygon)
      .filter((polygon) => polygon.length > 0)

    return coords.length > 0 ? { ...geometry, coordinates: coords } : null
  }

  return geometry
}

function normalizeOceaniaLongitude(lng) {
  return lng < 0 ? lng + 360 : lng
}

function normalizeOceaniaRing(ring) {
  return ring.map(([lng, lat, ...rest]) => [
    normalizeOceaniaLongitude(lng),
    lat,
    ...rest,
  ])
}

function normalizeGeometryForOceania(geometry) {
  if (!geometry) {
    return geometry
  }

  if (geometry.type === 'Polygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map(normalizeOceaniaRing),
    }
  }

  if (geometry.type === 'MultiPolygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map(normalizeOceaniaRing),
      ),
    }
  }

  return geometry
}

function getGeometryLongitudes(geometry) {
  if (!geometry) {
    return []
  }

  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flatMap((ring) =>
      ring.map(([lng]) => normalizeOceaniaLongitude(lng)),
    )
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((polygon) =>
      polygon.flatMap((ring) =>
        ring.map(([lng]) => normalizeOceaniaLongitude(lng)),
      ),
    )
  }

  return []
}

function isGeometryInOceaniaDisplayRange(geometry) {
  const longitudes = getGeometryLongitudes(geometry)

  return (
    longitudes.length > 0 &&
    Math.max(...longitudes) >= OCEANIA_MIN_DISPLAY_LONGITUDE
  )
}

function hasGeometryAntimeridianJump(geometry) {
  if (!geometry) {
    return false
  }

  if (geometry.type === 'Polygon') {
    return geometry.coordinates.some(hasAntimeridianJump)
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygon) =>
      polygon.some(hasAntimeridianJump),
    )
  }

  return false
}

function getCleanFeature(countryFeature) {
  if (hiddenShapeNames.has(countryFeature.properties.name)) {
    return null
  }

  if (countryFeature.geometry.type === 'Polygon') {
    if (
      isOverseasPolygonToHide(
        countryFeature,
        countryFeature.geometry.coordinates,
      )
    ) {
      return null
    }

    const geometry = cleanGeometry(countryFeature.geometry)

    if (!geometry) {
      return null
    }

    return {
      ...countryFeature,
      geometry,
    }
  }

  if (countryFeature.geometry.type === 'MultiPolygon') {
    const coordinates = countryFeature.geometry.coordinates
      .filter(
        (polygon) => !isOverseasPolygonToHide(countryFeature, polygon),
      )
    const geometry = cleanGeometry({
      ...countryFeature.geometry,
      coordinates,
    })

    if (!geometry) {
      return null
    }

    return {
      ...countryFeature,
      geometry,
    }
  }

  return countryFeature
}

const cleanCountryFeatures = countryFeatures.map(getCleanFeature).filter(Boolean)
const cleanShapeFeatureByName = cleanCountryFeatures.reduce(
  (shapeMap, countryFeature) => {
    shapeMap[countryFeature.properties.name] = countryFeature

    return shapeMap
  },
  {},
)
const rawVisibleShapeFeatures = countryFeatures.filter(
  (countryFeature) => !hiddenShapeNames.has(countryFeature.properties.name),
)
const shapeNames = new Set(
  rawVisibleShapeFeatures.map((countryFeature) => countryFeature.properties.name),
)
const rawShapeFeatureByName = rawVisibleShapeFeatures.reduce(
  (shapeMap, countryFeature) => {
    shapeMap[countryFeature.properties.name] = countryFeature

    return shapeMap
  },
  {},
)
const shapeNameAliases = {
  'Republic of the Congo': 'Congo',
  'Democratic Republic of the Congo': 'Dem. Rep. Congo',
  'Western Sahara': 'W. Sahara',
}
const SHAPE_NAME_MAP = {
  russie: ['Russia'],
  turquie: ['Turkey'],
  chypre: ['Cyprus'],
}
const shapeNameByNormalizedName = cleanCountryFeatures.reduce(
  (shapeMap, countryFeature) => {
    shapeMap[normalizeShapeName(countryFeature.properties.name)] =
      countryFeature.properties.name

    return shapeMap
  },
  {},
)

const rawShapeNameByNormalizedName = rawVisibleShapeFeatures.reduce(
  (shapeMap, countryFeature) => {
    shapeMap[normalizeShapeName(countryFeature.properties.name)] =
      countryFeature.properties.name

    return shapeMap
  },
  {},
)

function normalizeShapeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function getStableId(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getCountryId(country) {
  return country?.id || getStableId(country?.name)
}

function resolveAtlasShapeName(shapeName) {
  const atlasShapeName = shapeNameAliases[shapeName] || shapeName

  if (atlasShapeName) {
    if (shapeNames.has(atlasShapeName)) {
      return atlasShapeName
    }

    const normalizedMappedName =
      rawShapeNameByNormalizedName[normalizeShapeName(atlasShapeName)]

    if (normalizedMappedName) {
      return normalizedMappedName
    }
  }

  return null
}

function getMappedShapeNames(country) {
  const mappedShapeNames = countryShapeNames[country.name]

  if (!mappedShapeNames) {
    return [country.name]
  }

  return Array.isArray(mappedShapeNames) ? mappedShapeNames : [mappedShapeNames]
}

function resolveShapeNames(country) {
  const countryId = getCountryId(country)

  if (SHAPE_NAME_MAP[countryId]) {
    console.log('SHAPE MATCH', country.name, SHAPE_NAME_MAP[countryId])
    return SHAPE_NAME_MAP[countryId]
  }

  const resolvedShapeNames = getMappedShapeNames(country)
    .map(resolveAtlasShapeName)
    .filter(Boolean)

  if (resolvedShapeNames.length > 0) {
    console.log('SHAPE MATCH', country.name, resolvedShapeNames)
    return resolvedShapeNames
  }

  const fallbackShapeNames = [
    shapeNameByNormalizedName[normalizeShapeName(country.name)],
  ].filter(Boolean)

  console.log('SHAPE MATCH', country.name, fallbackShapeNames)

  return fallbackShapeNames
}

export function hasCountryShape(country) {
  return resolveShapeNames(country).length > 0
}

function getCountryByShapeName(countries) {
  return countries.reduce((shapeMap, country) => {
    for (const shapeName of resolveShapeNames(country)) {
      shapeMap[shapeName] = country
    }

    return shapeMap
  }, {})
}

function getAnsweredCountryKey(answeredCountry) {
  return typeof answeredCountry === 'string'
    ? answeredCountry
    : getCountryId(answeredCountry)
}

function getProgressKey(country) {
  return `${country.continent}-${country.name}`
}

function getPolygonFeature(countryFeature, territory) {
  if (!territory.source || countryFeature.geometry.type !== 'MultiPolygon') {
    return null
  }

  const coordinates = countryFeature.geometry.coordinates
    .filter((polygon) =>
      isInsideBounds(getRingBounds(polygon[0]), territory.source.bounds),
    )
    .map(cleanPolygon)
    .filter((polygon) => polygon.length > 0)

  if (coordinates.length === 0) {
    return null
  }

  return {
    type: 'Feature',
    properties: {
      ...countryFeature.properties,
      name: territory.name,
      id: territory.id,
      geoJsonName: countryFeature.properties.name,
      territoryId: territory.id,
      territoryName: territory.name,
    },
    geometry: {
      type: 'MultiPolygon',
      coordinates,
    },
  }
}

function getTerritoryFeatures(territory) {
  if (territory.source) {
    const sourceFeature = rawShapeFeatureByName[territory.source.shapeName]

    return sourceFeature ? [getPolygonFeature(sourceFeature, territory)].filter(Boolean) : []
  }

  return (territory.shapeNames || [])
    .map(resolveAtlasShapeName)
    .filter(Boolean)
    .map((shapeName) => rawShapeFeatureByName[shapeName])
    .filter(Boolean)
    .map(getCleanFeature)
    .filter(Boolean)
    .map((shapeFeature) => ({
      ...shapeFeature,
      properties: {
        ...shapeFeature.properties,
        id: territory.id,
        geoJsonName: shapeFeature.properties.name,
        territoryId: territory.id,
        territoryName: territory.name,
      },
    }))
}

const territoryFeatureItems = dependentTerritories.flatMap((territory) =>
  getTerritoryFeatures(territory).map((shapeFeature, index) => ({
    territory,
    feature: {
      ...shapeFeature,
      properties: {
        ...shapeFeature.properties,
        id: territory.id,
        geoJsonName: shapeFeature.properties.geoJsonName || shapeFeature.properties.name,
        territoryId: territory.id,
        territoryName: territory.name,
      },
    },
    key: `${territory.name}-${index}`,
  })),
)

function MapClickDebugger() {
  const map = useMap()

  useEffect(() => {
    console.log('LEAFLET PANES', map.getPanes())

    function handleMapClick(event) {
      console.log('MAP CLICK', event.latlng)
    }

    map.on('click', handleMapClick)

    return () => {
      map.off('click', handleMapClick)
    }
  }, [map])

  return null
}

function markMapClickHandled(event) {
  if (event?.originalEvent) {
    event.originalEvent._geoMemoShapeHandled = true
  }
}

function isMapClickHandled(event) {
  return Boolean(event?.originalEvent?._geoMemoShapeHandled)
}

function getPointLngLat(latlng) {
  return [latlng.lng, latlng.lat]
}

function isPointInRing(point, ring) {
  let isInside = false
  const [pointLng, pointLat] = point

  for (let currentIndex = 0, previousIndex = ring.length - 1;
    currentIndex < ring.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const [currentLng, currentLat] = ring[currentIndex]
    const [previousLng, previousLat] = ring[previousIndex]
    const intersects =
      currentLat > pointLat !== previousLat > pointLat &&
      pointLng <
        ((previousLng - currentLng) * (pointLat - currentLat)) /
          (previousLat - currentLat || Number.EPSILON) +
          currentLng

    if (intersects) {
      isInside = !isInside
    }
  }

  return isInside
}

function isPointInPolygon(point, polygon) {
  if (!polygon.length || !isPointInRing(point, polygon[0])) {
    return false
  }

  return !polygon.slice(1).some((ring) => isPointInRing(point, ring))
}

function isPointInGeometry(point, geometry) {
  if (!geometry) {
    return false
  }

  if (geometry.type === 'Polygon') {
    return isPointInPolygon(point, geometry.coordinates)
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygon) => isPointInPolygon(point, polygon))
  }

  return false
}

function getGeometryBounds(geometry) {
  const rings = getGeometryRings(geometry)
  const coordinates = rings.flat()

  if (coordinates.length === 0) {
    return null
  }

  const longitudes = coordinates.map(([lng]) => lng)
  const latitudes = coordinates.map(([, lat]) => lat)

  return {
    maxLat: Math.max(...latitudes),
    maxLng: Math.max(...longitudes),
    minLat: Math.min(...latitudes),
    minLng: Math.min(...longitudes),
  }
}

function getGeometryAreaScore(geometry) {
  const bounds = getGeometryBounds(geometry)

  if (!bounds) {
    return Number.MAX_SAFE_INTEGER
  }

  return Math.abs(bounds.maxLng - bounds.minLng) * Math.abs(bounds.maxLat - bounds.minLat)
}

function getProjectedBounds(map, geometry) {
  const bounds = getGeometryBounds(geometry)

  if (!bounds) {
    return null
  }

  const northWest = map.latLngToLayerPoint([bounds.maxLat, bounds.minLng])
  const southEast = map.latLngToLayerPoint([bounds.minLat, bounds.maxLng])

  return {
    bottom: Math.max(northWest.y, southEast.y),
    left: Math.min(northWest.x, southEast.x),
    right: Math.max(northWest.x, southEast.x),
    top: Math.min(northWest.y, southEast.y),
  }
}

function isLayerPointInPaddedBounds(layerPoint, bounds, padding) {
  return (
    layerPoint.x >= bounds.left - padding &&
    layerPoint.x <= bounds.right + padding &&
    layerPoint.y >= bounds.top - padding &&
    layerPoint.y <= bounds.bottom + padding
  )
}

function isMicroFeatureFallbackHit(map, layerPoint, geometry) {
  const bounds = getProjectedBounds(map, geometry)

  if (!bounds) {
    return false
  }

  const width = bounds.right - bounds.left
  const height = bounds.bottom - bounds.top
  const isMicroFeature = Math.max(width, height) < 32

  return isMicroFeature && isLayerPointInPaddedBounds(layerPoint, bounds, 10)
}

function getFallbackFeatureHit(map, event, featureItems) {
  const point = getPointLngLat(event.latlng)
  const layerPoint = event.layerPoint || map.latLngToLayerPoint(event.latlng)
  const hits = featureItems
    .filter(({ feature: shapeFeature }) =>
      isPointInGeometry(point, shapeFeature.geometry) ||
      isMicroFeatureFallbackHit(map, layerPoint, shapeFeature.geometry),
    )
    .sort(
      (firstItem, secondItem) =>
        getGeometryAreaScore(firstItem.feature.geometry) -
        getGeometryAreaScore(secondItem.feature.geometry),
    )

  return hits[0] || null
}

function MapFeatureClickFallback({
  answeredCorrectCountries,
  answeredCorrectTerritories,
  countryFeatureItems,
  isQuizMode,
  onSelectCountry,
  onSelectTerritory,
  territoryFeatureItems,
}) {
  const map = useMapEvents({
    click(event) {
      if (isMapClickHandled(event)) {
        return
      }

      const territoryHit = getFallbackFeatureHit(map, event, territoryFeatureItems)

      if (territoryHit) {
        if (
          !isQuizMode ||
          !isTerritoryAnswered(territoryHit.territory, answeredCorrectTerritories)
        ) {
          markMapClickHandled(event)
          onSelectTerritory?.(territoryHit.territory, territoryHit.feature)
        }

        return
      }

      const countryHit = getFallbackFeatureHit(map, event, countryFeatureItems)

      if (
        countryHit &&
        (!isQuizMode ||
          !isCountryAnswered(countryHit.country, answeredCorrectCountries))
      ) {
        markMapClickHandled(event)
        onSelectCountry?.(countryHit.country)
      }
    },
  })

  return null
}

function getShapeStyle(feature, countryByShapeName, options) {
  const country = countryByShapeName[feature.properties.name]
  const isCountryInQuiz = Boolean(country)
  const countryId = getCountryId(country)
  const countryStatus =
    country && !options.isQuizMode
      ? options.countryProgress?.[getProgressKey(country)]
      : null
  const isAnsweredCorrect =
    options.isQuizMode &&
    isCountryAnswered(country, options.answeredCorrectCountries || [])
  const isCorrect =
    options.correctCountry && getCountryId(options.correctCountry) === countryId
  const isWrong =
    options.wrongCountry && getCountryId(options.wrongCountry) === countryId
  const isCurrentQuizTarget =
    options.isQuizMode &&
    options.currentQuestion?.type === 'country' &&
    getCountryId(options.currentQuestion) === countryId &&
    !isAnsweredCorrect

  if (isAnsweredCorrect) {
    return COUNTRY_VALIDATED_STYLE
  }

  if (isCorrect) {
    return COUNTRY_VALIDATED_STYLE
  }

  if (isCurrentQuizTarget) {
    return getQuizTargetCountryStyle(options.isMobile)
  }

  if (isWrong) {
    return {
      ...COUNTRY_PATH_STYLE,
      color: '#991b1b',
      fillColor: '#ef4444',
      fillOpacity: 0.72,
      opacity: 0.9,
      weight: 1.2,
    }
  }

  if (isCountryInQuiz) {
    if (countryStatus === 'known') {
      return COUNTRY_VALIDATED_STYLE
    }

    if (countryStatus === 'review') {
      return COUNTRY_REVIEW_STYLE
    }

    return {
      ...COUNTRY_PATH_STYLE,
      color: COUNTRY_BORDER_COLOR,
      fillColor: getAreaColor(getCountryMapNodeId(country), options.areaColorById),
      fillOpacity: options.isQuizMode ? (options.isMobile ? 0.48 : 0.64) : 0.74,
      opacity: 0.9,
      weight: options.isQuizMode ? (options.isMobile ? 0.7 : 0.8) : 0.9,
    }
  }

  return {
    ...COUNTRY_PATH_STYLE,
    color: '#64748b',
    fillColor: '#e2e8f0',
    fillOpacity: 0.26,
    opacity: 0.82,
    weight: 0.8,
  }
}

function getTerritoryStyle(territory, areaColorById, options) {
  const isCurrentQuizTarget = isQuizTerritoryTarget(
    territory,
    options.currentQuestion,
  )

  if (isCurrentQuizTarget) {
    return getQuizTargetTerritoryStyle(options.isMobile)
  }

  return {
    ...TERRITORY_BASE_STYLE,
    fillColor: getAreaColor(getTerritoryMapNodeId(territory), areaColorById),
    fillOpacity: options.isMobile ? 0.44 : 0.54,
  }
}

function getAnsweredTerritoryStyle() {
  return TERRITORY_VALIDATED_STYLE
}

function normalizeMatchKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getAnsweredTerritoryKey(answeredTerritory) {
  return typeof answeredTerritory === 'string'
    ? answeredTerritory
    : answeredTerritory?.id
}

function getCanonicalTerritoryId(shapeFeature, territory) {
  const geoJsonName = shapeFeature?.properties?.geoJsonName
  const featureName = shapeFeature?.properties?.name
  const featureId = shapeFeature?.id || shapeFeature?.properties?.id
  const territoryId = territory?.id || shapeFeature?.properties?.territoryId
  const territoryName = territory?.name || shapeFeature?.properties?.territoryName

  if (
    geoJsonName === 'Greenland' ||
    featureName === 'Greenland' ||
    featureId === 'Greenland' ||
    territory?.id === 'groenland-danemark' ||
    territory?.name === 'Groenland'
  ) {
    return 'groenland-danemark'
  }

  if (
    territoryId === 'gibraltar-royaume-uni' ||
    territoryId === 'Gibraltar' ||
    territoryName === 'Gibraltar' ||
    geoJsonName === 'Gibraltar' ||
    featureName === 'Gibraltar' ||
    featureId === 'Gibraltar'
  ) {
    return 'gibraltar-royaume-uni'
  }

  return (
    territoryId ||
    shapeFeature?.properties?.territoryId ||
    shapeFeature?.properties?.id ||
    null
  )
}

function isArubaTerritory(territory) {
  return territory?.id === 'aruba-pays-bas'
}

function isGreenlandTerritory(territory) {
  return territory?.id === 'groenland-danemark'
}

function isUnitedStatesCountry(country) {
  return getCountryId(country) === 'etats-unis'
}

function isTerritoryAnswered(territory, answeredCorrectTerritories) {
  if (!territory) {
    return false
  }

  const validatedTerritoryIds = answeredCorrectTerritories
    .map(getAnsweredTerritoryKey)
    .filter(Boolean)

  const isValidated = validatedTerritoryIds.includes(territory.id)

  if (isValidated) {
    return true
  }

  return answeredCorrectTerritories.some((answeredTerritory) => {
    if (typeof answeredTerritory === 'string') {
      return (
        normalizeMatchKey(answeredTerritory) === normalizeMatchKey(territory.id) ||
        normalizeMatchKey(answeredTerritory) === normalizeMatchKey(territory.name) ||
        normalizeMatchKey(answeredTerritory) === normalizeMatchKey(territory.label)
      )
    }

    return (
      normalizeMatchKey(answeredTerritory.name) === normalizeMatchKey(territory.name) ||
      normalizeMatchKey(answeredTerritory.label) === normalizeMatchKey(territory.label)
    )
  })
}


function isCountryAnswered(country, answeredCorrectCountries) {
  if (!country) {
    return false
  }

  const countryKeys = new Set(
    [
      getCountryId(country),
      country.id,
      country.name,
      country.label,
    ]
      .filter(Boolean)
      .flatMap((value) => [normalizeMatchKey(value), getStableId(value)]),
  )

  return answeredCorrectCountries.some((answeredCountry) => {
    if (typeof answeredCountry === 'string') {
      return countryKeys.has(normalizeMatchKey(answeredCountry)) ||
        countryKeys.has(getStableId(answeredCountry))
    }

    const answeredKeys = [
      getAnsweredCountryKey(answeredCountry),
      answeredCountry.id,
      answeredCountry.name,
      answeredCountry.label,
      answeredCountry.text,
    ]
      .filter(Boolean)
      .flatMap((value) => [normalizeMatchKey(value), getStableId(value)])

    return answeredKeys.some((answeredKey) =>
      countryKeys.has(answeredKey),
    )
  })
}

function CountryShapeMap({
  countries,
  isQuizMode,
  correctCountry,
  answeredCorrectCountries = [],
  highlightedCountries = [],
  wrongCountry,
  onSelectCountry,
  territories = [],
  countryProgress = {},
  onSelectTerritory,
  territoryTooltips = true,
  answeredCorrectTerritories = [],
  showCountryShapes = true,
  currentQuestionId,
  currentQuestion,
}) {
  const isOceaniaMap =
    countries.length > 0 &&
    countries.every((country) => country.continent === 'Océanie')
  const displayCountries = useMemo(
    () =>
      isOceaniaMap
        ? countries.filter((country) => isOceaniaPlayableId(getCountryId(country)))
        : countries,
    [countries, isOceaniaMap],
  )
  const displayTerritories = useMemo(
    () =>
      territories.filter(
        (territory) => !isIndependentCountryTerritory(territory),
      ),
    [territories],
  )
  const countryByShapeName = getCountryByShapeName(displayCountries)
  const territoryByName = displayTerritories.reduce((territoryMap, territory) => {
    territoryMap[territory.name] = territory

    return territoryMap
  }, {})
  const territoryById = displayTerritories.reduce((territoryMap, territory) => {
    territoryMap[territory.id] = territory

    return territoryMap
  }, {})
  const visibleCountryFeatures = useMemo(
    () =>
      showCountryShapes
        ? displayCountries.flatMap((country) =>
            resolveShapeNames(country).map((shapeName) => {
              const shapeFeature =
                cleanCountryFeatures.find(
                  (feature) => feature.properties.name === shapeName,
                ) || rawShapeFeatureByName[shapeName]

              if (!shapeFeature) {
                return null
              }

              const cleanedGeometry = cleanGeometry(shapeFeature.geometry)
              const displayShapeFeature =
                cleanedGeometry || !hasGeometryAntimeridianJump(shapeFeature.geometry)
                  ? {
                      ...shapeFeature,
                      geometry: cleanedGeometry || shapeFeature.geometry,
                    }
                  : null

              if (!displayShapeFeature) {
                return null
              }

              if (
                isOceaniaMap &&
                !isGeometryInOceaniaDisplayRange(displayShapeFeature.geometry)
              ) {
                return null
              }

              const geometry = isOceaniaMap
                ? normalizeGeometryForOceania(displayShapeFeature.geometry)
                : displayShapeFeature.geometry

              return {
                ...displayShapeFeature,
                geometry,
                properties: {
                  ...displayShapeFeature.properties,
                  id: getCountryId(country),
                  countryId: getCountryId(country),
                  countryName: country.name,
                  mapNodeId: getCountryMapNodeId(country),
                },
              }
            }),
          ).filter(Boolean)
        : [],
    [displayCountries, isOceaniaMap, showCountryShapes],
  )
  const highlightedCountryIds = useMemo(
    () => new Set(highlightedCountries.map(getCountryId)),
    [highlightedCountries],
  )
  const highlightedCountryFeatures = useMemo(
    () =>
      visibleCountryFeatures.filter((shapeFeature) =>
        highlightedCountryIds.has(shapeFeature.properties.countryId),
      ),
    [highlightedCountryIds, visibleCountryFeatures],
  )
  const countryFeatureItems = useMemo(
    () =>
      visibleCountryFeatures
        .map((shapeFeature) => ({
          country: countryByShapeName[shapeFeature.properties.name],
          feature: shapeFeature,
        }))
        .filter(({ country }) => country),
    [countryByShapeName, visibleCountryFeatures],
  )
  const visibleTerritoryFeatureItems = territoryFeatureItems
    .filter(({ territory }) => territoryByName[territory.name])
    .filter(
      ({ feature: shapeFeature }) =>
        !isOceaniaMap ||
        isGeometryInOceaniaDisplayRange(shapeFeature.geometry),
    )
    .map((territoryFeatureItem) =>
      isOceaniaMap
        ? {
            ...territoryFeatureItem,
            feature: {
            ...territoryFeatureItem.feature,
            geometry: normalizeGeometryForOceania(
              territoryFeatureItem.feature.geometry,
            ),
            properties: {
              ...territoryFeatureItem.feature.properties,
              mapNodeId: getTerritoryMapNodeId(territoryFeatureItem.territory),
            },
          },
        }
        : {
            ...territoryFeatureItem,
            feature: {
              ...territoryFeatureItem.feature,
              properties: {
                ...territoryFeatureItem.feature.properties,
                mapNodeId: getTerritoryMapNodeId(territoryFeatureItem.territory),
              },
            },
          },
    )
  const isMobileScreen =
    typeof window !== 'undefined' && window.innerWidth <= 768
  const currentQuizTargetCountryId =
    currentQuestion?.type === 'country' ? getCountryId(currentQuestion) : null
  const currentQuizTargetTerritoryId =
    currentQuestion?.type === 'territory'
      ? getCanonicalTerritoryId(currentQuestion)
      : null
  const areaColorById = useMemo(
    () =>
      getAreaColorMap([
        ...visibleCountryFeatures,
        ...visibleTerritoryFeatureItems.map(({ feature: shapeFeature }) => shapeFeature),
      ]),
    [visibleCountryFeatures, visibleTerritoryFeatureItems],
  )
  const visibleSmallClickableTerritories = displayTerritories
    .filter(
      (territory) =>
        smallClickableTerritoryIds.has(territory.id) &&
        Array.isArray(territory.position),
    )
    .map((territory) =>
      isOceaniaMap
        ? {
            ...territory,
            position:
              OCEANIA_TERRITORY_MARKER_POSITION_OVERRIDES[territory.id] ?? [
                territory.position[0],
                normalizeOceaniaLongitude(territory.position[1]),
              ],
          }
        : territory,
    )
    .filter(
      (territory) =>
        !isOceaniaMap ||
        territory.position[1] >= OCEANIA_MIN_DISPLAY_LONGITUDE,
    )
  const visibleSmallCountryMarkers = displayCountries
    .map((country) => ({
      country,
      marker: SMALL_COUNTRY_MARKERS[getCountryId(country)]
        ? {
            ...SMALL_COUNTRY_MARKERS[getCountryId(country)],
            lng: isOceaniaMap
              ? normalizeOceaniaLongitude(
                  SMALL_COUNTRY_MARKERS[getCountryId(country)].lng,
                )
              : SMALL_COUNTRY_MARKERS[getCountryId(country)].lng,
          }
        : null,
    }))
    .filter(({ marker }) => marker)
    .filter(
      ({ marker }) =>
        !isOceaniaMap || marker.lng >= OCEANIA_MIN_DISPLAY_LONGITUDE,
    )

  useEffect(() => {
    if (!import.meta.env.DEV || !isOceaniaMap) {
      return
    }

    const visibleCountryIds = new Set([
      ...visibleCountryFeatures
        .map((shapeFeature) => shapeFeature.properties.countryId)
        .filter(Boolean),
      ...visibleSmallCountryMarkers.map(({ country }) => getCountryId(country)),
    ])
    const visibleTerritoryIds = new Set([
      ...visibleTerritoryFeatureItems
        .map(({ territory }) => territory.id)
        .filter(Boolean),
      ...visibleSmallClickableTerritories.map((territory) => territory.id),
    ])
    const missingCountries = displayCountries.filter(
      (country) => !visibleCountryIds.has(getCountryId(country)),
    )
    const missingTerritories = displayTerritories.filter(
      (territory) => !visibleTerritoryIds.has(territory.id),
    )

    if (missingCountries.length > 0 || missingTerritories.length > 0) {
      console.log('OCEANIA ITEMS WITHOUT VISIBLE SHAPE OR MARKER', {
        countries: missingCountries.map((country) => ({
          id: getCountryId(country),
          name: country.name,
        })),
        territories: missingTerritories.map((territory) => ({
          id: territory.id,
          name: territory.name,
        })),
      })
    }
  }, [
    displayCountries,
    displayTerritories,
    isOceaniaMap,
    visibleCountryFeatures,
    visibleSmallClickableTerritories,
    visibleSmallCountryMarkers,
    visibleTerritoryFeatureItems,
  ])

  function handleTerritoryHover(territory) {
    if (import.meta.env.DEV && isArubaTerritory(territory)) {
      console.log('HOVER TERRITORY', territory.id, territory.name)
    }
  }

  function handleTerritoryClick(territory, shapeFeature = null) {
    const canonicalTerritoryId = getCanonicalTerritoryId(shapeFeature, territory)
    const resolvedTerritory = {
      ...territory,
      id: canonicalTerritoryId || territory.id,
      type: 'territory',
    }

    if (import.meta.env.DEV && (isGreenlandTerritory(resolvedTerritory) || resolvedTerritory.id === 'gibraltar-royaume-uni')) {
      console.log(
        'TERRITORY CLICK HANDLER FIRED',
        shapeFeature?.properties,
        resolvedTerritory,
      )
      console.log('TERRITORY VALIDATION TEST', {
        clickedId: resolvedTerritory.id,
        clickedType: resolvedTerritory.type,
        currentQuestionId: currentQuestion?.id || currentQuestionId,
        currentQuestionType: currentQuestion?.type,
        match: resolvedTerritory.id === (currentQuestion?.id || currentQuestionId),
      })
    }

    if (import.meta.env.DEV && isArubaTerritory(territory)) {
      console.log('CLICK TERRITORY', resolvedTerritory.id, resolvedTerritory.name)
    }

    onSelectTerritory?.(resolvedTerritory)
  }

  function handleSmallTerritoryClick(territory) {

    handleTerritoryClick(territory)
  }

  return (
    <>
      {/* <MapClickDebugger /> */}

      <MapFeatureClickFallback
        answeredCorrectCountries={answeredCorrectCountries}
        answeredCorrectTerritories={answeredCorrectTerritories}
        countryFeatureItems={countryFeatureItems}
        isQuizMode={isQuizMode}
        onSelectCountry={onSelectCountry}
        onSelectTerritory={handleTerritoryClick}
        territoryFeatureItems={visibleTerritoryFeatureItems}
      />

      <Pane
        name="country-marine-outline"
        style={{ zIndex: 390, pointerEvents: 'none' }}
      >
        <GeoJSON
          data={visibleCountryFeatures}
          interactive={false}
          key={`marine-outline-${currentQuestionId || 'no-question'}-${countries.map(getCountryId).join('-')}-${isQuizMode}`}
          pane="country-marine-outline"
          style={() => MARINE_OUTLINE_STYLE}
        />
      </Pane>

      <GeoJSON
        data={visibleCountryFeatures}
        key={`${currentQuestionId || 'no-question'}-${countries.map(getCountryId).join('-')}-${answeredCorrectCountries.map(getAnsweredCountryKey).join('-')}-${getCountryId(correctCountry) || ''}-${getCountryId(wrongCountry) || ''}-${isQuizMode}`}
        onEachFeature={(shapeFeature, layer) => {
          const country = countryByShapeName[shapeFeature.properties.name]

          if (!country) {
            return
          }

          const isCurrentTarget =
            currentQuizTargetCountryId === getCountryId(country)

          layer.on({
            add: () => {
              const element = layer.getElement?.()

              if (element) {
                element.dataset.mapNodeId = getCountryMapNodeId(country)

                if (isCurrentTarget) {
                  element.dataset.currentTarget = 'true'
                }
              }
            },
            click: (event) => {
              markMapClickHandled(event)

              if (import.meta.env.DEV && isUnitedStatesCountry(country)) {
                console.log('CLICK USA', getCountryId(country), currentQuestionId)
                console.log(
                  'VALIDATED COUNTRIES',
                  answeredCorrectCountries.map(getAnsweredCountryKey),
                )
              }

              if (!isQuizMode || !isCountryAnswered(country, answeredCorrectCountries)) {
                onSelectCountry(country)
              }
            },
          })
        }}
        style={(shapeFeature) =>
          getShapeStyle(shapeFeature, countryByShapeName, {
            correctCountry,
            answeredCorrectCountries,
            areaColorById,
            countryProgress,
            currentQuestion,
            isMobile: isMobileScreen,
            isQuizMode,
            wrongCountry,
          })
        }
      />

      {highlightedCountryFeatures.length > 0 && (
        <Pane
          name="guided-reference-halos"
          style={{ zIndex: 610, pointerEvents: 'none' }}
        >
          <GeoJSON
            data={highlightedCountryFeatures}
            interactive={false}
            key={`guided-reference-halos-${highlightedCountryFeatures
              .map((shapeFeature) => shapeFeature.properties.countryId)
              .join('-')}`}
            pane="guided-reference-halos"
            style={() => GUIDED_REFERENCE_HALO_STYLE}
          />
        </Pane>
      )}

      {visibleTerritoryFeatureItems.length > 0 && (
        <Pane name="territory-polygons" style={{ zIndex: 650 }}>
          <GeoJSON
            bubblingMouseEvents={false}
            data={visibleTerritoryFeatureItems.map(({ feature: shapeFeature }) => shapeFeature)}
            interactive
            key={`territories-${currentQuestionId || 'no-question'}-${visibleTerritoryFeatureItems
              .map(({ key }) => key)
              .join('-')}-${answeredCorrectTerritories
              .map(getAnsweredTerritoryKey)
              .filter(Boolean)
              .join('-')}`}
            onEachFeature={(shapeFeature, layer) => {
              const resolvedTerritory =
                territoryById[shapeFeature.properties.territoryId] ||
                territoryByName[shapeFeature.properties.territoryName]

              if (!resolvedTerritory) {
                return
              }

              if (territoryTooltips) {
                layer.bindTooltip(
                  `${resolvedTerritory.label} - ${territoryStatusLabels[resolvedTerritory.politicalStatus].toLowerCase()}`,
                  {
                    direction: 'top',
                    opacity: 0.95,
                    sticky: true,
                  },
                )
              }
              layer.bringToFront()

              layer.on({
                add: () => {
                  const element = layer.getElement?.()

                  if (element) {
                    element.style.pointerEvents = 'auto'
                    element.dataset.mapNodeId = getTerritoryMapNodeId(resolvedTerritory)

                    if (
                      currentQuizTargetTerritoryId ===
                      getCanonicalTerritoryId(resolvedTerritory)
                    ) {
                      element.dataset.currentTarget = 'true'
                    }
                  }
                },
                mouseover: () => {
                  handleTerritoryHover(resolvedTerritory)
                },
                mouseout: () => {
                  layer.setStyle(
                    isQuizMode &&
                    isTerritoryAnswered(
                      resolvedTerritory,
                      answeredCorrectTerritories,
                    )
                      ? getAnsweredTerritoryStyle()
                      : getTerritoryStyle(resolvedTerritory, areaColorById, {
                          currentQuestion,
                          isMobile: isMobileScreen,
                          isQuizMode,
                        }),
                  )
                },
                click: (event) => {
                  markMapClickHandled(event)

                  if (
                    !isQuizMode ||
                    !isTerritoryAnswered(
                      resolvedTerritory,
                      answeredCorrectTerritories,
                    )
                  ) {
                    handleTerritoryClick(resolvedTerritory, shapeFeature)
                  }
                },
              })
            }}
            pane="territory-polygons"
            style={(shapeFeature) => {
              const territory =
                territoryById[shapeFeature.properties.territoryId] ||
                territoryByName[shapeFeature.properties.territoryName]
              const isAnsweredCorrect =
                isQuizMode &&
                isTerritoryAnswered(
                  territory,
                  answeredCorrectTerritories,
                )

              if (isAnsweredCorrect) {
                return getAnsweredTerritoryStyle()
              }

              return getTerritoryStyle(territory, areaColorById, {
                currentQuestion,
                isMobile: isMobileScreen,
                isQuizMode,
              })
            }}
          />
        </Pane>
      )}

      {visibleSmallClickableTerritories.length > 0 && (
        <Pane name="small-territory-click-targets" style={{ zIndex: 720 }}>
          {visibleSmallClickableTerritories.map((territory) => {
            const isAnsweredCorrect =
              isQuizMode &&
              isTerritoryAnswered(
                territory,
                answeredCorrectTerritories,
              )
            const isTargetTerritory =
              isQuizMode &&
              isQuizTerritoryTarget(territory, currentQuestion)
            const territoryMarkerFillColor =
              isAnsweredCorrect
                ? TERRITORY_VALIDATED_STYLE.fillColor
                : isTargetTerritory
                  ? QUIZ_TARGET_FILL_COLOR
                  : getAreaColor(getTerritoryMapNodeId(territory), areaColorById)
            const territoryMarkerStrokeColor =
              isAnsweredCorrect
                ? TERRITORY_VALIDATED_STYLE.color
                : isTargetTerritory
                  ? QUIZ_TARGET_STROKE_COLOR
                  : TERRITORY_BASE_STYLE.color
            const territoryMarkerRadius =
              isOceaniaMap ? 16 : isMobileScreen ? 10 : 8
            const territoryMarkerWeight =
              isAnsweredCorrect
                ? 3
                : isTargetTerritory
                  ? isMobileScreen
                    ? 4
                    : 3
                  : 1.4
            const territoryMarkerFillOpacity =
              isAnsweredCorrect
                ? 0.94
                : isTargetTerritory
                  ? 0.9
                  : 0.34
            const decorativeIslets =
              isOceaniaMap && isQuizMode
                ? OCEANIA_DECORATIVE_ARCHIPELAGO_OFFSETS[territory.id] ?? []
                : []

            return (
              <Fragment key={`territory-click-target-${territory.id}-${isAnsweredCorrect ? 'answered' : 'normal'}`}>
                {decorativeIslets.map((islet, index) => (
                  <CircleMarker
                    key={`decorative-islet-${territory.id}-${index}`}
                    bubblingMouseEvents={false}
                    center={[
                      territory.position[0] + islet.lat,
                      territory.position[1] + islet.lng,
                    ]}
                    color="#9a6b35"
                    fill
                    fillColor="#f3d9a4"
                    fillOpacity={0.95}
                    interactive={false}
                    opacity={0.95}
                    pane="small-territory-click-targets"
                    radius={islet.radius}
                    stroke
                    weight={1}
                  />
                ))}
                <CircleMarker
                  bubblingMouseEvents={false}
                  center={territory.position}
                  eventHandlers={{
                    add: (event) => {
                      const element = event.target?.getElement?.()

                      if (element) {
                        element.dataset.mapNodeId = getTerritoryMapNodeId(territory)

                        if (isTargetTerritory) {
                          element.dataset.currentTarget = 'true'
                        }
                      }
                    },
                    click: (event) => {
                      markMapClickHandled(event)

                      if (!isAnsweredCorrect) {
                        handleSmallTerritoryClick(territory)
                      }
                    },
                    mouseover: () => handleTerritoryHover(territory),
                  }}
                  fillColor={territoryMarkerFillColor}
                  fillOpacity={territoryMarkerFillOpacity}
                  fill
                  interactive
                  pane="small-territory-click-targets"
                  radius={territoryMarkerRadius}
                  stroke
                  color={territoryMarkerStrokeColor}
                  opacity={isAnsweredCorrect ? 1 : 0.82}
                  weight={territoryMarkerWeight}
                />
                <CircleMarker
                  bubblingMouseEvents={false}
                  center={territory.position}
                  eventHandlers={{
                    add: (event) => {
                      const element = event.target?.getElement?.()

                      if (element) {
                        element.dataset.mapNodeId = getTerritoryMapNodeId(territory)
                      }
                    },
                    click: (event) => {
                      markMapClickHandled(event)

                      if (!isAnsweredCorrect) {
                        handleSmallTerritoryClick(territory)
                      }
                    },
                    mouseover: () => handleTerritoryHover(territory),
                  }}
                  fillOpacity={0}
                  interactive
                  opacity={0}
                  pane="small-territory-click-targets"
                  radius={isOceaniaMap ? 24 : 24}
                  fill={false}
                  color="transparent"
                  stroke={false}
                />
              </Fragment>
            )
          })}
        </Pane>
      )}

      {visibleSmallCountryMarkers.length > 0 && (
        <Pane name="small-country-click-targets" style={{ zIndex: 730 }}>
          {visibleSmallCountryMarkers.map(({ country, marker }) => {
            const countryStatus = !isQuizMode
              ? countryProgress[getProgressKey(country)]
              : null
            const isAnsweredCorrect =
              isQuizMode && isCountryAnswered(country, answeredCorrectCountries)
            const isTargetCountry =
              isQuizMode &&
              isQuizCountryTarget(country, currentQuestion)
            const markerStrokeColor =
              isAnsweredCorrect
                ? COUNTRY_VALIDATED_STYLE.color
                : isTargetCountry
                  ? QUIZ_TARGET_STROKE_COLOR
                  : countryStatus === 'known'
                    ? '#14532d'
                  : countryStatus === 'review'
                    ? '#92400e'
                    : COUNTRY_BORDER_COLOR
            const markerRadius =
              isOceaniaMap ? 16 : isMobileScreen ? 10 : 8
            const markerWeight =
              isAnsweredCorrect
                ? 3
                : isTargetCountry
                  ? isMobileScreen
                    ? 4
                    : 3
                  : 1.5
            const markerFillOpacity =
              isAnsweredCorrect
                ? 0.94
                : isTargetCountry
                  ? 0.9
                  : countryStatus
                    ? 0.85
                    : 0.68
            const markerFillColor =
              isAnsweredCorrect
                ? COUNTRY_VALIDATED_STYLE.fillColor
                : countryStatus === 'known'
                  ? '#22c55e'
                : countryStatus === 'review'
                  ? '#facc15'
                  : isOceaniaMap
                    ? getOceaniaCountryMarkerColor(country)
                    : getAreaColor(getCountryMapNodeId(country), areaColorById)
            const center = [marker.lat, marker.lng]

            return (
              <Fragment key={`small-country-marker-${getCountryId(country)}-${isAnsweredCorrect ? 'answered' : 'normal'}`}>
                <CircleMarker
                  bubblingMouseEvents={false}
                  center={center}
                  eventHandlers={{
                    add: (event) => {
                      const element = event.target?.getElement?.()

                      if (element) {
                        element.dataset.mapNodeId = getCountryMapNodeId(country)

                        if (isTargetCountry) {
                          element.dataset.currentTarget = 'true'
                        }
                      }
                    },
                    click: (event) => {
                      markMapClickHandled(event)

                      if (!isAnsweredCorrect) {
                        onSelectCountry(country)
                      }
                    },
                  }}
                  fillColor={markerFillColor}
                  fillOpacity={markerFillOpacity}
                  interactive
                  pane="small-country-click-targets"
                  radius={markerRadius}
                  stroke
                  color={markerStrokeColor}
                  opacity={isAnsweredCorrect ? 1 : 0.9}
                  weight={markerWeight}
                />
                <CircleMarker
                  bubblingMouseEvents={false}
                  center={center}
                  eventHandlers={{
                    add: (event) => {
                      const element = event.target?.getElement?.()

                      if (element) {
                        element.dataset.mapNodeId = getCountryMapNodeId(country)
                      }
                    },
                    click: (event) => {
                      markMapClickHandled(event)

                      if (!isAnsweredCorrect) {
                        onSelectCountry(country)
                      }
                    },
                  }}
                  fillOpacity={0}
                  interactive
                  opacity={0}
                  pane="small-country-click-targets"
                  radius={isOceaniaMap ? 24 : 24}
                  fill={false}
                  color="transparent"
                  stroke={false}
                />
              </Fragment>
            )
          })}
        </Pane>
      )}
    </>
  )
}

export default CountryShapeMap
