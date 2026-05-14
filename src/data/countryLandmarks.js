export const countryLandmarks = [
  {
    countryName: 'France',
    landmarkName: 'Tour Eiffel',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Eiffel_Tower_from_the_Tour_Montparnasse_3%2C_Paris_May_2014.jpg',
    imageDescription: 'Silhouette métallique de la Tour Eiffel à Paris.',
  },
  {
    countryName: 'Italie',
    landmarkName: 'Colisée',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Colosseum_in_Rome%2C_Italy_-_April_2007.jpg',
    imageDescription: 'Amphithéâtre antique aux arches superposées à Rome.',
  },
  {
    countryName: 'Égypte',
    landmarkName: 'Pyramides de Gizeh',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/All_Gizah_Pyramids.jpg',
    imageDescription: 'Grandes pyramides de pierre dans le désert près du Caire.',
  },
  {
    countryName: 'Chine',
    landmarkName: 'Grande Muraille',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/The_Great_Wall_of_China_at_Jinshanling-edit.jpg',
    imageDescription: 'Long mur fortifié serpentant sur des crêtes montagneuses.',
  },
  {
    countryName: 'Inde',
    landmarkName: 'Taj Mahal',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Taj_Mahal_in_March_2004.jpg',
    imageDescription: 'Mausolée blanc avec grand dôme et bassins symétriques.',
  },
  {
    countryName: 'Brésil',
    landmarkName: 'Christ Rédempteur',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cristo_Redentor_-_Rio_de_Janeiro%2C_Brasil.jpg',
    imagePosition: 'center top',
    imageDescription: 'Grande statue aux bras ouverts dominant Rio de Janeiro.',
  },
  {
    countryName: 'États-Unis',
    landmarkName: 'Statue de la Liberté',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Statue_of_Liberty_7.jpg',
    imagePosition: 'center top',
    imageDescription: 'Statue tenant une torche sur une île de New York.',
  },
  {
    countryName: 'Japon',
    landmarkName: 'Mont Fuji',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mount_Fuji_from_Hotel_Mt_Fuji_%282014-12-06%29.jpg',
    imageFallbacks: [
      'https://commons.wikimedia.org/wiki/Special:FilePath/Mount_Fuji_from_Hotel_Mt_Fuji_1995-2-7.jpg',
      'https://commons.wikimedia.org/wiki/Special:FilePath/Mt._Fuji_%2814930757221%29.jpg',
    ],
    imageDescription: 'Volcan conique souvent enneigé près de Tokyo.',
  },
  {
    countryName: 'Royaume-Uni',
    landmarkName: 'Big Ben',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Clock_Tower_-_Palace_of_Westminster%2C_London_-_May_2007.jpg',
    imageDescription: 'Grande tour horloge du palais de Westminster à Londres.',
  },
  {
    countryName: 'Allemagne',
    landmarkName: 'Porte de Brandebourg',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Brandenburger_Tor_abends.jpg',
    imageDescription: 'Monument néoclassique avec colonnes à Berlin.',
  },
  {
    countryName: 'Espagne',
    landmarkName: 'Sagrada Família',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sagrada_Familia_01.jpg',
    imageDescription: 'Basilique élancée aux tours sculptées à Barcelone.',
  },
  {
    countryName: 'Grèce',
    landmarkName: 'Parthénon',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/The_Parthenon_in_Athens.jpg',
    imageDescription: 'Temple antique à colonnes sur l’Acropole d’Athènes.',
  },
  {
    countryName: 'Mexique',
    landmarkName: 'Chichén Itzá',
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Chichen_Itza_3.jpg',
    imageDescription: 'Pyramide maya à degrés au Yucatán.',
  },
  {
    countryName: 'Pérou',
    landmarkName: 'Machu Picchu',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Machu_Picchu%2C_Peru.jpg',
    imageDescription: 'Ancienne cité inca perchée dans les Andes.',
  },
  {
    countryName: 'Australie',
    landmarkName: 'Opéra de Sydney',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sydney_Opera_House_Sails.jpg',
    imageDescription: 'Bâtiment aux voiles blanches au bord de la baie.',
  },
  {
    countryName: 'Maroc',
    landmarkName: 'Mosquée Hassan II',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Hassan_II_Mosque_Casablanca_Morocco.jpg',
    imageDescription: 'Grande mosquée au minaret élevé face à l’Atlantique.',
  },
  {
    countryName: 'Turquie',
    landmarkName: 'Sainte-Sophie',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Hagia_Sophia_Mars_2013.jpg',
    imageDescription: 'Monument byzantin à grand dôme à Istanbul.',
  },
  {
    countryName: 'Jordanie',
    landmarkName: 'Pétra',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Al_Khazneh_Petra_edit_2.jpg',
    imageDescription: 'Façade taillée dans la roche rose du désert.',
  },
  {
    countryName: 'Cambodge',
    landmarkName: 'Angkor Wat',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Angkor_Wat_%286201911987%29.jpg',
    imageDescription: 'Temple khmer aux tours en forme de lotus.',
  },
  {
    countryName: 'Russie',
    landmarkName: 'Cathédrale Saint-Basile',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Saint_Basil%27s_Cathedral_and_the_Red_Square.jpg',
    imageDescription: 'Cathédrale aux bulbes colorés sur la place Rouge.',
  },
]

export function getCountryLandmark(countryName) {
  return countryLandmarks.find((landmark) => landmark.countryName === countryName)
}

export const normalizedCountryLandmarks = countryLandmarks.map((landmark) => ({
  ...landmark,
  name: landmark.landmarkName,
  country: landmark.countryName,
  description: landmark.imageDescription,
}))
