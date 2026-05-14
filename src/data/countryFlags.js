export const countryFlagCodes = {
  Allemagne: 'DE',
  Australie: 'AU',
  Brésil: 'BR',
  Cambodge: 'KH',
  Canada: 'CA',
  Chine: 'CN',
  Égypte: 'EG',
  Espagne: 'ES',
  'États-Unis': 'US',
  France: 'FR',
  Grèce: 'GR',
  Inde: 'IN',
  Italie: 'IT',
  Japon: 'JP',
  Jordanie: 'JO',
  Maroc: 'MA',
  Mexique: 'MX',
  Pérou: 'PE',
  'République dominicaine': 'DO',
  'Royaume-Uni': 'GB',
  Russie: 'RU',
  Turquie: 'TR',
}

export function countryCodeToFlagEmoji(code) {
  if (!code || typeof code !== 'string') {
    return null
  }

  const normalizedCode = code.trim().toUpperCase()

  if (!/^[A-Z]{2}$/.test(normalizedCode)) {
    return null
  }

  return normalizedCode.replace(/./g, (char) =>
    String.fromCodePoint(127397 + char.charCodeAt(0)),
  )
}

export function getCountryFlag(countryName) {
  return countryCodeToFlagEmoji(countryFlagCodes[countryName])
}
