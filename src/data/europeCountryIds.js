export const EUROPE_COUNTRY_IDS = [
  'albanie',
  'allemagne',
  'andorre',
  'autriche',
  'belgique',
  'bielorussie',
  'bosnie-herzegovine',
  'bulgarie',
  'chypre',
  'croatie',
  'danemark',
  'espagne',
  'estonie',
  'finlande',
  'france',
  'grece',
  'hongrie',
  'irlande',
  'islande',
  'italie',
  'kosovo',
  'lettonie',
  'liechtenstein',
  'lituanie',
  'luxembourg',
  'macedoine-du-nord',
  'malte',
  'moldavie',
  'monaco',
  'montenegro',
  'norvege',
  'pays-bas',
  'pologne',
  'portugal',
  'roumanie',
  'royaume-uni',
  'russie',
  'saint-marin',
  'serbie',
  'slovaquie',
  'slovenie',
  'suede',
  'suisse',
  'tchequie',
  'turquie',
  'ukraine',
  'vatican',
]

export function getStableCountryId(country) {
  return String(country?.id || country?.name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function isEuropeCountry(country) {
  return EUROPE_COUNTRY_IDS.includes(getStableCountryId(country))
}

export function getCountriesForContinent(countries, continent) {
  if (continent === 'Europe') {
    return countries.filter(isEuropeCountry)
  }

  return countries.filter((country) => country.continent === continent)
}
