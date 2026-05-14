import { countryPositions } from './countryPositions'

export function getPositionKey(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

export function getCountryPosition(country) {
  return countryPositions[getPositionKey(country.name)]
}

export function getDistanceInKm(firstPosition, secondPosition) {
  const earthRadius = 6371
  const firstLat = (firstPosition[0] * Math.PI) / 180
  const secondLat = (secondPosition[0] * Math.PI) / 180
  const latDifference = ((secondPosition[0] - firstPosition[0]) * Math.PI) / 180
  const lngDifference = ((secondPosition[1] - firstPosition[1]) * Math.PI) / 180
  const distancePart =
    Math.sin(latDifference / 2) * Math.sin(latDifference / 2) +
    Math.cos(firstLat) *
      Math.cos(secondLat) *
      Math.sin(lngDifference / 2) *
      Math.sin(lngDifference / 2)

  return (
    earthRadius *
    2 *
    Math.atan2(Math.sqrt(distancePart), Math.sqrt(1 - distancePart))
  )
}

function getNearbyCountries(country, countries) {
  const position = getCountryPosition(country)

  return countries
    .filter((nearbyCountry) => nearbyCountry.name !== country.name)
    .map((nearbyCountry) => ({
      country: nearbyCountry,
      distance: getDistanceInKm(position, getCountryPosition(nearbyCountry)),
    }))
    .sort((first, second) => first.distance - second.distance)
    .slice(0, 3)
    .map((nearbyCountry) => nearbyCountry.country.name)
}

function getDirectionClues(country, countries) {
  const position = getCountryPosition(country)
  const nearbyCountries = getNearbyCountries(country, countries)

  if (nearbyCountries.length === 0) {
    return ['Il se repère surtout par sa position isolée sur la carte.']
  }

  return nearbyCountries.slice(0, 2).map((nearbyCountryName) => {
    const nearbyCountry = countries.find(
      (countryItem) => countryItem.name === nearbyCountryName,
    )
    const nearbyPosition = getCountryPosition(nearbyCountry)
    const vertical =
      position[0] > nearbyPosition[0] ? 'au nord de' : 'au sud de'
    const horizontal =
      position[1] > nearbyPosition[1] ? 'à l’est de' : 'à l’ouest de'

    if (
      Math.abs(position[0] - nearbyPosition[0]) >
      Math.abs(position[1] - nearbyPosition[1])
    ) {
      return `Il est ${vertical} ${nearbyCountryName}.`
    }

    return `Il est ${horizontal} ${nearbyCountryName}.`
  })
}

function getGeoType(country) {
  const text = `${country.geography} ${country.mnemonic}`.toLowerCase()

  if (text.includes('archipel')) {
    return 'archipel'
  }

  if (text.includes('île') || text.includes('insulaire')) {
    return 'île'
  }

  if (
    text.includes('côte') ||
    text.includes('bord') ||
    text.includes('océan') ||
    text.includes('mer')
  ) {
    return 'côte'
  }

  if (text.includes('enclavé') || text.includes('sans accès à la mer')) {
    return 'intérieur'
  }

  return 'repère continental'
}

function getSeaClue(country) {
  const text = country.geography.toLowerCase()

  if (
    text.includes('océan') ||
    text.includes('mer') ||
    text.includes('golfe') ||
    text.includes('côte') ||
    text.includes('bord')
  ) {
    return 'Il touche la mer ou un océan.'
  }

  return 'Il est plutôt à l’intérieur des terres.'
}

export function getLearningDetails(country, countries) {
  const nearbyCountries = getNearbyCountries(country, countries)
  const directionClues = getDirectionClues(country, countries)

  return {
    neighbors: nearbyCountries,
    relativePosition: country.geography,
    geoType: getGeoType(country),
    guidedClues: [
      directionClues[0],
      nearbyCountries.length >= 2
        ? `Il est proche de ${nearbyCountries[0]} et ${nearbyCountries[1]}.`
        : 'Il se repère surtout par sa position isolée.',
      getSeaClue(country),
    ].filter(Boolean),
  }
}
