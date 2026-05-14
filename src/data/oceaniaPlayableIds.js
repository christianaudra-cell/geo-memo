export const OCEANIA_PLAYABLE_IDS = [
  'australie',
  'nouvelle-zelande',
  'papouasie-nouvelle-guinee',
  'fidji',
  'vanuatu',
  'samoa',
  'tonga',
  'iles-salomon',
  'kiribati',
  'tuvalu',
  'micronesie',
  'iles-marshall',
  'palaos',
  'nauru',
  'nouvelle-caledonie-france',
]

export const OCEANIA_PLAYABLE_ID_SET = new Set(OCEANIA_PLAYABLE_IDS)

export function isOceaniaPlayableId(id) {
  return OCEANIA_PLAYABLE_ID_SET.has(id)
}
