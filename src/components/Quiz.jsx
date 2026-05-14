import { useEffect, useMemo, useState } from 'react'
import { MapContainer, useMap } from 'react-leaflet'
import CountryShapeMap, { hasCountryShape } from './CountryShapeMap'
import { getLearningDetails } from '../data/learningDetails'
import { dependentTerritories } from '../data/dependentTerritories'
import { countryFlagCodes, getCountryFlag, getCountryFlagCode } from '../data/countryFlags'
import { countryLandmarks, getCountryLandmark } from '../data/countryLandmarks'
import { useLanguage } from '../context/LanguageContext'
import '/node_modules/flag-icons/css/flag-icons.min.css'
import {
  getSmartCapitalCategoryLabel,
  smartCapitalCategories,
  smartCapitals,
} from '../data/smartCapitals'

const quizTypes = [
  { id: 'continent' },
  { id: 'capital' },
  { id: 'flag' },
  { id: 'landmark' },
  { id: 'map-mixed' },
]

const FLAG_QUIZ_MAX_QUESTIONS = 50
const IMAGE_QUIZ_MAX_QUESTIONS = 50
const AVAILABLE_FLAG_ICON_CODES = new Set(
  Object.values(countryFlagCodes)
    .filter((code) => typeof code === 'string' && /^[A-Z]{2}$/i.test(code.trim()))
    .map((code) => code.trim().toLowerCase()),
)

const mapSettingsByContinent = {
  Europe: { center: [50, 15], zoom: 4 },
  Afrique: { center: [2, 20], zoom: 3 },
  Asie: { center: [30, 85], zoom: 3 },
  'Amérique': { center: [5, -75], zoom: 3 },
  'Océanie': {
    center: [-12, 178],
    zoom: 2.7,
    bounds: [
      [-36, 122],
      [16, 222],
    ],
    fitOptions: {
      paddingTopLeft: [40, 92],
      paddingBottomRight: [40, 40],
      animate: false,
    },
    panOffset: [450, 0],
  },
}

function shuffleList(list) {
  return [...list].sort(() => Math.random() - 0.5)
}

function isMapQuizType(quizType) {
  return quizType === 'map' || quizType === 'map-mixed'
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

function getItemId(item) {
  return item.id || `${item.type}-${item.name}`
}

function getCountryItem(country) {
  return {
    ...country,
    id: getCountryId(country),
    type: 'country',
    label: country.name,
  }
}

function getLandmarkImageSources(landmark) {
  return [landmark?.image, ...(landmark?.imageFallbacks || [])].filter(
    (imageSource) =>
      typeof imageSource === 'string' &&
      /^https?:\/\//i.test(imageSource.trim()),
  )
}

function hasAvailableLandmarkImage(country, failedLandmarkImages = {}) {
  const landmark = getCountryLandmark(country.name)

  if (!landmark) {
    return false
  }

  return getLandmarkImageSources(landmark).some(
    (imageSource) => !failedLandmarkImages[imageSource],
  )
}

function countryCodeToFlagEmoji(code) {
  if (!code || typeof code !== 'string') {
    return null
  }

  const normalized = code.trim().toUpperCase()

  if (!/^[A-Z]{2}$/.test(normalized)) {
    return null
  }

  try {
    const flagEmoji = normalized
      .split('')
      .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('')

    // Vérifier que le résultat est un emoji valide (pas un code ISO brut)
    if (flagEmoji && flagEmoji.length > 2) {
      return flagEmoji
    }
  } catch (error) {
    // Si la conversion échoue, retourner null
    return null
  }

  return null
}

function getDisplayFlag(country) {
  if (!country) {
    return null
  }

  // Chercher le drapeau dans les champs possibles
  let raw =
    country.flag ||
    country.flagEmoji ||
    country.flagCode ||
    country.isoCode ||
    country.code ||
    country.alpha2

  // Si pas de champ flag trouvé, chercher via le nom du pays
  if (!raw) {
    raw = getCountryFlagCode(country.name) || getCountryFlag(country.name)
  }

  if (!raw || typeof raw !== 'string') {
    return null
  }

  const normalized = raw.trim()

  // Si c'est déjà un emoji (longueur > 2), extraire le code ISO
  if (normalized.length > 2) {
    // Les emojis drapeaux sont composés de caractères régionaux
    // Nous devons les convertir en codes ISO pour flag-icons
    // Cette fonction inverse la conversion emoji -> code ISO
    try {
      const codePoints = [...normalized].map(char => char.codePointAt(0))
      if (codePoints.length === 2) {
        const isoCode = codePoints
          .map(cp => String.fromCharCode(cp - 127397))
          .join('')
          .toUpperCase()
        if (/^[A-Z]{2}$/.test(isoCode)) {
          return isoCode.toLowerCase()
        }
      }
    } catch (error) {
      // Si la conversion échoue, continuer
    }
  }

  // Si c'est un code ISO à 2 lettres, le retourner en minuscules pour flag-icons
  if (/^[A-Za-z]{2}$/.test(normalized)) {
    return normalized.toLowerCase()
  }

  // Ne jamais retourner un code ISO brut en majuscules ou un emoji
  return null
}

function hasValidFlag(country) {
  if (!country) {
    return false
  }

  const flagCode = getDisplayFlag(country)

  if (!flagCode || typeof flagCode !== 'string') {
    return false
  }

  const normalizedCode = flagCode.trim().toLowerCase()

  if (!/^[a-z]{2}$/.test(normalizedCode)) {
    return false
  }

  return AVAILABLE_FLAG_ICON_CODES.has(normalizedCode)
}

function getTerritoryItem(territory) {
  return {
    ...territory,
    id: territory.id,
    type: 'territory',
  }
}

function isIndependentCountryTerritory(territory) {
  return territory?.politicalStatus === 'independent'
}

function getCanonicalTerritoryId(territory) {
  const rawId = String(territory?.id || '').toLowerCase()
  const rawName = String(territory?.name || '').toLowerCase()
  const rawLabel = String(territory?.label || '').toLowerCase()
  const rawShapeNames = territory?.shapeNames || []

  if (
    territory?.id === 'groenland-danemark' ||
    territory?.name === 'Groenland' ||
    territory?.shapeNames?.includes('Greenland')
  ) {
    return 'groenland-danemark'
  }

  if (
    rawId === 'gibraltar-royaume-uni' ||
    rawId === 'gibraltar' ||
    rawName === 'gibraltar' ||
    rawLabel.includes('gibraltar') ||
    rawShapeNames.includes('Gibraltar')
  ) {
    return 'gibraltar-royaume-uni'
  }

  return territory?.id || getStableId(`${territory?.name}-${territory?.parentCountry}`)
}

function getSmartCapitalItem(smartCapital, countries) {
  const country = countries.find(
    (countryItem) => countryItem.name === smartCapital.countryName,
  )

  return {
    ...country,
    ...smartCapital,
    type: 'smart-capital',
    name: smartCapital.countryName,
    label: smartCapital.countryName,
    country,
  }
}

function getQuestionItems(countries, territories, quizType, failedLandmarkImages = {}) {
  if (quizType === 'flag') {
    return countries.filter(hasValidFlag).map(getCountryItem)
  }

  if (quizType === 'landmark') {
    return countries
      .filter((country) => hasAvailableLandmarkImage(country, failedLandmarkImages))
      .map(getCountryItem)
  }

  if (quizType === 'map') {
    return countries.filter(hasCountryShape).map(getCountryItem)
  }

  if (quizType === 'map-mixed') {
    return [
      ...countries.filter(hasCountryShape).map(getCountryItem),
      ...territories
        .filter((territory) => !isIndependentCountryTerritory(territory))
        .map(getTerritoryItem),
    ]
  }

  return countries.map(getCountryItem)
}

function getSmartCapitalItems(countries, selectedCategory) {
  return smartCapitals
    .filter(
      (smartCapital) =>
        selectedCategory === 'all' || smartCapital.category === selectedCategory,
    )
    .map((smartCapital) => getSmartCapitalItem(smartCapital, countries))
    .filter((item) => item.country)
}

function getQuestionText(item, quizType, t) {
  if (quizType === 'smart-capital') {
    return item.countryName
  }

  if (quizType === 'flag') {
    return getDisplayFlag(item) || t?.('quiz.feedback.flagMissing') || ''
  }

  if (quizType === 'landmark') {
    return getCountryLandmark(item.name)?.landmarkName || item.name
  }

  return item.label || item.name
}

function getCorrectAnswer(item, quizType) {
  if (quizType === 'smart-capital') {
    return item.capital
  }

  if (quizType === 'continent') {
    return item.continent
  }

  if (quizType === 'capital') {
    return item.capital
  }

  return item.label || item.name
}

function getAnswerPool(countries, continents, quizType) {
  if (quizType === 'continent') {
    return continents
  }

  if (quizType === 'capital') {
    return countries.map((country) => country.capital)
  }

  if (quizType === 'smart-capital') {
    return smartCapitals.map((smartCapital) => smartCapital.capital)
  }

  return countries.map((country) => country.name)
}

function makeQuestion(items, countries, continents, quizType, excludeItemId = null) {
  if (items.length === 0) {
    return null
  }

  const availableItems = excludeItemId
    ? items.filter((item) => getItemId(item) !== excludeItemId)
    : items
  const selectableItems = availableItems.length > 0 ? availableItems : items
  const item = selectableItems[Math.floor(Math.random() * selectableItems.length)]
  const correctAnswer = getCorrectAnswer(item, quizType)

  if (isMapQuizType(quizType)) {
    return {
      item,
      country: item.type === 'country' ? item : null,
      territory: item.type === 'territory' ? item : null,
      text: getQuestionText(item, quizType),
      correctAnswer,
      answers: [],
    }
  }

  const wrongAnswers = getAnswerPool(
    countries,
    continents,
    quizType,
  ).filter((answer) => answer !== correctAnswer)

  return {
    item,
    country:
      item.type === 'country'
        ? item
        : item.type === 'smart-capital'
          ? item.country
          : null,
    territory: item.type === 'territory' ? item : null,
    text: getQuestionText(item, quizType),
    correctAnswer,
    answers: shuffleList([
      correctAnswer,
      ...shuffleList(wrongAnswers).slice(0, 3),
    ]),
  }
}

function getUnansweredItems(items, answeredCorrectItems) {
  const answeredIds = new Set(answeredCorrectItems.map(getItemId))

  return items.filter((item) => !answeredIds.has(getItemId(item)))
}

function getFlagSessionItems(items) {
  return shuffleList(items).slice(0, FLAG_QUIZ_MAX_QUESTIONS)
}

function getLandmarkSessionItems(items) {
  return shuffleList(items).slice(0, IMAGE_QUIZ_MAX_QUESTIONS)
}

function isAnsweredCorrectItem(item, answeredCorrectItems) {
  if (!item) {
    return false
  }

  return answeredCorrectItems.some(
    (answeredItem) => getItemId(answeredItem) === getItemId(item),
  )
}

function getCorrection(question, quizType, t) {
  if (quizType === 'smart-capital') {
    return t('quiz.correction.capital', {
      country: question.item.countryName,
      capital: question.item.capital,
    })
  }

  if (question.territory) {
    return t('quiz.correction.territory', { name: question.territory.label })
  }

  if (quizType === 'flag') {
    return t('quiz.correction.flag', { name: question.country.name })
  }

  if (quizType === 'landmark') {
    return t('quiz.correction.landmark', {
      landmark: getCountryLandmark(question.country.name)?.landmarkName,
      country: question.country.name,
    })
  }

  if (quizType === 'continent') {
    return t('quiz.correction.continent', {
      country: question.country.name,
      continent: question.country.continent,
    })
  }

  if (quizType === 'capital') {
    return t('quiz.correction.capital', {
      country: question.country.name,
      capital: question.country.capital,
    })
  }

  if (quizType === 'map' || quizType === 'map-mixed') {
    return t('quiz.correction.country', { name: question.country.name })
  }

  return t('quiz.correction.country', { name: question.country.name })
}

function getMapSettings(continent) {
  if (mapSettingsByContinent[continent]) {
    return mapSettingsByContinent[continent]
  }

  // Vue monde volontairement plus dézoomée : cela redonne de l'espace
  // visuel à la Méditerranée et évite l'impression Europe/Afrique collées.
  return { center: [14, 12], zoom: 1.45 }
}

function getMapStats(items, answeredCorrectItems) {
  const remainingItems = getUnansweredItems(items, answeredCorrectItems)

  return {
    countriesDone: answeredCorrectItems.filter((item) => item.type === 'country')
      .length,
    territoriesDone: answeredCorrectItems.filter(
      (item) => item.type === 'territory',
    ).length,
    remaining: remainingItems.length,
    total: items.length,
  }
}

function shouldShowTerritoryShapes(quizType) {
  return quizType === 'map-mixed'
}

function getQuizEndTone(scorePercent) {
  if (scorePercent >= 80) {
    return 'high'
  }

  if (scorePercent >= 50) {
    return 'medium'
  }

  return 'low'
}

function QuizEndScreen({
  correctAnswers,
  wrongAnswers,
  scorePercent,
  onRestart,
  onChangeQuiz,
  onBackHome,
}) {
  const { t } = useLanguage()
  const tone = getQuizEndTone(scorePercent)
  const messageKey =
    tone === 'high'
      ? 'quiz.end.high'
      : tone === 'medium'
        ? 'quiz.end.medium'
        : 'quiz.end.low'

  return (
    <div className={`quiz-end-card ${tone}`}>
      <p className="eyebrow">{t('quiz.end.eyebrow')}</p>
      <h2>{t('quiz.end.title')}</h2>
      <p className="quiz-end-message">
        {t(messageKey, { wrong: wrongAnswers })}
      </p>
      <div className="quiz-end-stats">
        <p>
          <span>{t('quiz.end.correct')}</span>
          <strong>{correctAnswers}</strong>
        </p>
        <p>
          <span>{t('quiz.end.wrong')}</span>
          <strong>{wrongAnswers}</strong>
        </p>
        <p>
          <span>{t('quiz.end.finalScore')}</span>
          <strong>{scorePercent} %</strong>
        </p>
      </div>
      <div className="quiz-end-actions">
        <button type="button" className="primary-button" onClick={onRestart}>
          {t('common.restart')}
        </button>
        <button type="button" className="secondary-button" onClick={onChangeQuiz}>
          {t('quiz.actions.changeQuiz')}
        </button>
        <button type="button" className="secondary-button" onClick={onBackHome}>
          {t('common.backHome')}
        </button>
      </div>
    </div>
  )
}

function QuizMapFocus({ settings }) {
  const map = useMap()

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      map.invalidateSize()

      if (settings.bounds) {
        map.fitBounds(settings.bounds, settings.fitOptions || { animate: false })

        if (settings.panOffset) {
          map.panBy(settings.panOffset, { animate: false })
        }

        return
      }

      map.setView(settings.center, settings.zoom, { animate: false })
    }, 120)

    return () => window.clearTimeout(focusTimer)
  }, [map, settings])

  return null
}

function QuizShapeMapOverlay({
  countries,
  territories,
  continent,
  quizType,
  question,
  hasAnswered,
  wrongCountry,
  wrongTerritory,
  feedback,
  answeredCorrectItems,
  mapStats,
  isFinished,
  scorePercent,
  onAnswerCountry,
  onAnswerTerritory,
  onClose,
  onNextQuestion,
  onRestartContinent,
}) {
  const { t } = useLanguage()
  const mapSettings = getMapSettings(continent)
  const questionCountry = question?.country
  const questionTerritory = question?.territory
  const questionTargetLabel =
    questionTerritory?.label || questionCountry?.name || question?.item?.label || question?.item?.name
  const learningDetails = questionCountry
    ? getLearningDetails(questionCountry, countries)
    : null
  const answeredCountries = answeredCorrectItems.filter(
    (item) => item.type === 'country',
  )
  const answeredTerritories = answeredCorrectItems.filter(
    (item) => item.type === 'territory',
  )

  return (
    <div className="quiz-map-fullscreen">
      <div className="quiz-map-hud">
        <div className="quiz-map-stat">
          <span>{t('common.score')}</span>
          <strong>{scorePercent} %</strong>
        </div>
        <div className="quiz-map-question">
          <span>{t('quiz.map.title')}</span>
          <strong>
            {question
              ? t('quiz.prompts.map', { text: questionTargetLabel })
              : t('quiz.map.finished')}
          </strong>
        </div>
        <div className="quiz-map-stat">
          <span>{t('quiz.map.done')}</span>
          <strong>
            {t('quiz.map.countriesCount', { count: mapStats.countriesDone })}
            {quizType === 'map-mixed'
              ? ` / ${t('quiz.map.territoriesCount', {
                  count: mapStats.territoriesDone,
                })}`
              : ''}
          </strong>
        </div>
        <div className="quiz-map-stat">
          <span>{t('quiz.map.remaining')}</span>
          <strong>{mapStats.remaining}</strong>
        </div>
        <button type="button" className="secondary-button" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>

      <MapContainer
        center={mapSettings.center}
        className="quiz-shape-map"
        maxBounds={[
          [-85, -220],
          [85, 220],
        ]}
        maxBoundsViscosity={0.85}
        minZoom={1.25}
        scrollWheelZoom
        worldCopyJump={false}
        zoom={mapSettings.zoom}
        zoomSnap={0.05}
        zoomDelta={0.25}
      >
        <QuizMapFocus settings={mapSettings} />
        <CountryShapeMap
          continent={continent}
          countries={countries}
          answeredCorrectCountries={answeredCountries}
          correctCountry={hasAnswered && questionCountry ? questionCountry : null}
          isQuizMode
          wrongCountry={wrongCountry}
          territories={shouldShowTerritoryShapes(quizType) ? territories : []}
          territoryTooltips={false}
          answeredCorrectTerritories={answeredTerritories}
          currentQuestion={question?.item}
          currentQuestionId={question?.item?.id}
          onSelectCountry={onAnswerCountry}
          onSelectTerritory={onAnswerTerritory}
        />
      </MapContainer>

      {isFinished && (
        <aside className="quiz-map-learning-card">
          <p className="eyebrow">{t('quiz.map.finished')}</p>
          <h3>{t('quiz.end.title')}</h3>
          <p>{t('quiz.map.allValidated')}</p>
          <button
            type="button"
            className="primary-button"
            onClick={onClose}
          >
            {t('quiz.actions.seeResults')}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onRestartContinent}
          >
            {t('common.restart')}
          </button>
        </aside>
      )}

      {!isFinished && hasAnswered && question && (
        <aside className="quiz-map-learning-card">
          <p className="eyebrow">
            {wrongCountry || wrongTerritory
              ? t('quiz.map.correction')
              : t('quiz.map.goodAnswer')}
          </p>
          <h3>{questionTargetLabel}</h3>
          <p>
            <strong>{t('common.type')} :</strong>{' '}
            {questionTerritory
              ? t('quiz.map.dependentTerritory')
              : t('quiz.map.independentCountry')}
          </p>
          {questionTerritory ? (
            <>
              <p>
                <strong>{t('quiz.map.attachment')} :</strong>{' '}
                {questionTerritory.parentCountry}
              </p>
              <p>
                <strong>{t('quiz.map.location')} :</strong>{' '}
                {questionTerritory.geography}
              </p>
            </>
          ) : (
            <>
              <p className="mnemonic">
                <strong>{t('learn.labels.mnemonic')} :</strong> {questionCountry.mnemonic}
              </p>
              <p>
                <strong>{t('quiz.map.location')} :</strong>{' '}
                {learningDetails.relativePosition}
              </p>
              <p>
                <strong>{t('quiz.map.mainNeighbors')} :</strong>{' '}
                {learningDetails.neighbors.join(', ')}
              </p>
            </>
          )}
          {feedback && <p className="feedback">{feedback}</p>}
          <button
            type="button"
            className="primary-button"
            onClick={onNextQuestion}
          >
            {t('common.nextQuestion')}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onRestartContinent}
          >
            {t('common.restart')}
          </button>
        </aside>
      )}
    </div>
  )
}

function Quiz({ countries, continents, onBackHome = () => {} }) {
  const { t } = useLanguage()
  const continentChoices = useMemo(
    () => ['Tous les continents', ...continents],
    [continents],
  )
  const [quizType, setQuizType] = useState('continent')
  const [quizContinent, setQuizContinent] = useState('Tous les continents')
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [wrongAnswers, setWrongAnswers] = useState(0)
  const [isMapQuizOpen, setIsMapQuizOpen] = useState(false)
  const [wrongMapCountry, setWrongMapCountry] = useState(null)
  const [wrongMapTerritory, setWrongMapTerritory] = useState(null)
  const [answeredCorrectCountries, setAnsweredCorrectCountries] = useState([])
  const [answeredCorrectTerritories, setAnsweredCorrectTerritories] = useState([])
  const [answeredCorrectLandmarks, setAnsweredCorrectLandmarks] = useState([])
  const [answeredFlagItems, setAnsweredFlagItems] = useState([])
  const [flagSessionItems, setFlagSessionItems] = useState([])
  const [landmarkSessionItems, setLandmarkSessionItems] = useState([])
  const [smartCapitalCategory, setSmartCapitalCategory] = useState('all')
  const [failedLandmarkImages, setFailedLandmarkImages] = useState({})
  const [isQuizFinished, setIsQuizFinished] = useState(false)

  const usesContinentFilter = quizType !== 'continent'
  const quizCountries = useMemo(() => {
    if (!usesContinentFilter) {
      return countries
    }

    if (quizContinent === 'Tous les continents') {
      return countries
    }

    return countries.filter((country) => country.continent === quizContinent)
  }, [countries, quizContinent, usesContinentFilter])

  const quizTerritories = useMemo(() => {
    const territoriesForQuiz = dependentTerritories.filter(
      (territory) => !isIndependentCountryTerritory(territory),
    )

    if (quizContinent === 'Tous les continents') {
      return territoriesForQuiz
    }

    return territoriesForQuiz.filter(
      (territory) => territory.continent === quizContinent,
    )
  }, [quizContinent])

  const availableQuestionItems = useMemo(() => {
    if (quizType === 'smart-capital') {
      return getSmartCapitalItems(countries, smartCapitalCategory)
    }

    return getQuestionItems(
      quizCountries,
      quizTerritories,
      quizType,
      failedLandmarkImages,
    )
  }, [
    countries,
    failedLandmarkImages,
    quizCountries,
    quizTerritories,
    quizType,
    smartCapitalCategory,
  ])
  const questionItems = quizType === 'flag'
    ? flagSessionItems
    : quizType === 'landmark'
      ? landmarkSessionItems
      : availableQuestionItems
  const [question, setQuestion] = useState(() =>
    makeQuestion(
      countries.map(getCountryItem),
      countries,
      continents,
      'continent',
    ),
  )

  function getQuizTypeLabel(typeId) {
    if (typeId === 'continent') return t('quiz.types.continent.label')
    if (typeId === 'capital') return t('quiz.types.capital.label')
    if (typeId === 'flag') return t('quiz.types.flag.label')
    if (typeId === 'landmark') return t('quiz.types.landmark.label')
    return t('quiz.types.mapMixed.label')
  }
  const selectedTypeQuestionKey =
    quizType === 'continent'
      ? 'quiz.types.continent.question'
      : quizType === 'capital'
        ? 'quiz.types.capital.question'
        : quizType === 'flag'
          ? 'quiz.types.flag.question'
          : quizType === 'landmark'
            ? 'quiz.types.landmark.question'
            : 'quiz.types.mapMixed.question'
  const totalAnswers = correctAnswers + wrongAnswers
  const scorePercent =
    totalAnswers === 0 ? 0 : Math.round((correctAnswers / totalAnswers) * 100)
  const hasAnswered = selectedAnswer !== ''
  const answeredCorrectItems = useMemo(
    () => [...answeredCorrectCountries, ...answeredCorrectTerritories],
    [answeredCorrectCountries, answeredCorrectTerritories],
  )
  const hasAnsweredCurrentMapQuestion =
    hasAnswered || isAnsweredCorrectItem(question?.item, answeredCorrectItems)
  const mapStats = isMapQuizType(quizType)
    ? getMapStats(questionItems, answeredCorrectItems)
    : { countriesDone: 0, territoriesDone: 0, remaining: 0, total: 0 }
  const landmarkStats =
    quizType === 'landmark'
      ? {
          done: answeredCorrectLandmarks.length,
          total: questionItems.length,
          remaining: Math.max(
            questionItems.length - answeredCorrectLandmarks.length,
            0,
          ),
        }
      : { done: 0, total: 0, remaining: 0 }
  const flagStats =
    quizType === 'flag'
      ? {
          done: correctAnswers,
          total: questionItems.length,
          remaining: Math.max(questionItems.length - answeredFlagItems.length, 0),
        }
      : { done: 0, total: 0, remaining: 0 }
  const isMapQuizFinished =
    isMapQuizType(quizType) &&
    questionItems.length > 0 &&
    mapStats.remaining === 0 &&
    (!question || hasAnsweredCurrentMapQuestion)

  useEffect(() => {
    const nextQuestionItems =
      quizType === 'flag'
        ? getFlagSessionItems(availableQuestionItems)
        : quizType === 'landmark'
          ? getLandmarkSessionItems(availableQuestionItems)
          : availableQuestionItems

    if (quizType === 'flag') {
      setFlagSessionItems(nextQuestionItems)
      setAnsweredFlagItems([])
    }

    if (quizType === 'landmark') {
      setLandmarkSessionItems(nextQuestionItems)
      if (import.meta.env.DEV) {
        console.log('Landmark quiz pool', {
          totalLandmarks: countryLandmarks.length,
          validLandmarkImages: availableQuestionItems.length,
          sessionLandmarkCount: nextQuestionItems.length,
        })
      }
    }

    setQuestion(
      makeQuestion(
        nextQuestionItems,
        quizCountries,
        continents,
        quizType,
      ),
    )
    setSelectedAnswer('')
    setFeedback('')
    setWrongMapCountry(null)
    setWrongMapTerritory(null)
    setIsQuizFinished(false)
  }, [
    availableQuestionItems,
    continents,
    quizCountries,
    quizTerritories,
    quizType,
    smartCapitalCategory,
  ])

  useEffect(() => {
    if (quizType === 'flag') {
      setCorrectAnswers(0)
      setWrongAnswers(0)
    }
    setAnsweredCorrectCountries([])
    setAnsweredCorrectTerritories([])
    setAnsweredCorrectLandmarks([])
    setAnsweredFlagItems([])
    setFlagSessionItems([])
    setLandmarkSessionItems([])
    setFailedLandmarkImages({})
    setIsQuizFinished(false)
  }, [quizContinent, quizType])

  useEffect(() => {
    if (quizType === 'landmark' && questionItems.length === 0) {
      setQuestion(null)
      setSelectedAnswer('')
      setFeedback('')
      setIsQuizFinished(true)
    }
  }, [questionItems.length, quizType])

  function handleAnswer(answer) {
    if (hasAnswered || !question) {
      return
    }

    const isCorrect = answer === question.correctAnswer
    setSelectedAnswer(answer)

    if (quizType === 'flag' && question.item) {
      setAnsweredFlagItems((currentFlags) =>
        currentFlags.some((currentFlag) => getItemId(currentFlag) === getItemId(question.item))
          ? currentFlags
          : [...currentFlags, question.item],
      )
    }

    if (isCorrect) {
      setCorrectAnswers((currentCorrectAnswers) => currentCorrectAnswers + 1)
      if (quizType === 'landmark' && question.item) {
        setAnsweredCorrectLandmarks((currentLandmarks) =>
          currentLandmarks.some(
            (currentLandmark) => getItemId(currentLandmark) === getItemId(question.item),
          )
            ? currentLandmarks
            : [...currentLandmarks, question.item],
        )
      }
      setFeedback(t('quiz.feedback.correct', { correction: getCorrection(question, quizType, t) }))
    } else {
      setWrongAnswers((currentWrongAnswers) => currentWrongAnswers + 1)
      setFeedback(t('quiz.feedback.incorrect', { correction: getCorrection(question, quizType, t) }))
    }
  }

  function getQuestionVisual() {
    if (!question) {
      return null
    }

    if (quizType === 'flag') {
      const flagCode = getDisplayFlag(question.country || question.item)

      return (
        <div className="quiz-visual flag-visual" aria-label={t('quiz.labels.flagToRecognize')}>
          {flagCode ? (
            <span className="country-flag flag-frame quiz-flag-frame">
              <span className={`fi fi-${flagCode}`}></span>
            </span>
          ) : (
            <span className="flag-missing">{t('quiz.feedback.flagMissing')}</span>
          )}
        </div>
      )
    }

    if (quizType === 'landmark') {
      if (!question.country) {
        return (
          <div className="quiz-visual landmark-visual">
            <div className="quiz-image-container">
              <div className="quiz-image-placeholder">{t('quiz.feedback.imageMissing')}</div>
            </div>
          </div>
        )
      }

      const landmark = getCountryLandmark(question.country.name)

      if (!landmark) {
        return (
          <div className="quiz-visual landmark-visual">
            <div className="quiz-image-container">
              <div className="quiz-image-placeholder">{t('quiz.feedback.imageMissing')}</div>
            </div>
          </div>
        )
      }

      const imageSources = getLandmarkImageSources(landmark)
      const visibleImage = imageSources.find(
        (imageSource) => !failedLandmarkImages[imageSource],
      )

      return (
        <div className="quiz-visual landmark-visual">
          <div className="quiz-image-container">
            {visibleImage ? (
              <img
                alt={landmark.landmarkName}
                className="quiz-image"
                loading="lazy"
                src={visibleImage}
                style={{
                  objectPosition: landmark.imagePosition || 'center',
                }}
                onError={() => {
                  setFailedLandmarkImages((failedImages) => ({
                    ...failedImages,
                    [visibleImage]: true,
                  }))
                }}
              />
            ) : (
              <div className="quiz-image-placeholder">{t('quiz.feedback.imageMissing')}</div>
            )}
          </div>
          <p>{landmark.imageDescription}</p>
        </div>
      )
    }

    return null
  }

  function saveCorrectMapAnswer(item) {
    setCorrectAnswers(correctAnswers + 1)
    if (item.type === 'territory') {
      setAnsweredCorrectTerritories((currentTerritories) =>
        currentTerritories.some(
          (currentTerritory) => getItemId(currentTerritory) === getItemId(item),
        )
          ? currentTerritories
          : [...currentTerritories, item],
      )
    } else {
      setAnsweredCorrectCountries((currentCountries) =>
        currentCountries.some(
          (currentCountry) => getItemId(currentCountry) === getItemId(item),
        )
          ? currentCountries
          : [...currentCountries, item],
      )
    }
    setFeedback(t('quiz.feedback.goodMap', { correction: getCorrection(question, quizType, t) }))
  }

  function handleMapAnswer(clickedCountry) {
    if (hasAnswered || !question) {
      return
    }

    const clickedItem = getCountryItem(clickedCountry)
    const isCorrect =
      question.item.type === 'country' &&
      getCountryId(clickedCountry) === getCountryId(question.country)

    setSelectedAnswer(clickedCountry.name)
    setWrongMapCountry(isCorrect ? null : clickedCountry)
    setWrongMapTerritory(null)

    if (isCorrect) {
      saveCorrectMapAnswer(question.item)
    } else {
      setWrongAnswers(wrongAnswers + 1)
      setFeedback(
        t('quiz.feedback.wrongCountry', {
          clicked: clickedItem.name,
          correction: getCorrection(question, quizType, t),
        }),
      )
    }
  }

  function handleMapTerritoryAnswer(clickedTerritory) {
    if (hasAnswered || !question) {
      return
    }

    const clickedItem = getTerritoryItem(clickedTerritory)
    const clickedTerritoryId = getCanonicalTerritoryId(clickedTerritory)
    const currentQuestionId = getCanonicalTerritoryId(
      question.territory || question.item,
    )
    const isCorrect =
      question.item.type === 'territory' &&
      clickedItem.type === 'territory' &&
      clickedTerritoryId === currentQuestionId

    if (import.meta.env.DEV && (clickedTerritoryId === 'gibraltar-royaume-uni' || currentQuestionId === 'gibraltar-royaume-uni')) {
      console.log('GIBRALTAR TERRITORY ANSWER', {
        clickedName: clickedTerritory?.name,
        clickedId: clickedTerritory?.id,
        clickedCanonicalId: clickedTerritoryId,
        expectedName: question.territory?.name || question.item?.name,
        expectedId: question.territory?.id || question.item?.id,
        expectedCanonicalId: currentQuestionId,
        isCorrect,
      })
    }

    setSelectedAnswer(clickedTerritory.name)
    setWrongMapTerritory(isCorrect ? null : clickedTerritory)
    setWrongMapCountry(null)

    if (isCorrect) {
      saveCorrectMapAnswer(question.item)
    } else {
      setWrongAnswers(wrongAnswers + 1)
      setFeedback(
        t('quiz.feedback.wrongTerritory', {
          clicked: clickedItem.label,
          correction: getCorrection(question, quizType, t),
        }),
      )
    }
  }

  function goToNextQuestion() {
    const nextItems = isMapQuizType(quizType)
      ? getUnansweredItems(questionItems, answeredCorrectItems)
      : quizType === 'flag'
        ? getUnansweredItems(questionItems, answeredFlagItems)
      : quizType === 'landmark'
        ? getUnansweredItems(questionItems, answeredCorrectLandmarks)
        : questionItems

    if (
      questionItems.length > 0 &&
      (nextItems.length === 0 ||
        (quizType === 'flag' && nextItems.length === 0) ||
        (!isMapQuizType(quizType) &&
          quizType !== 'flag' &&
          quizType !== 'landmark' &&
          totalAnswers >= questionItems.length))
    ) {
      setQuestion(null)
      setSelectedAnswer('')
      setFeedback('')
      setWrongMapCountry(null)
      setWrongMapTerritory(null)
      setIsMapQuizOpen(false)
      setIsQuizFinished(true)
      return
    }

    const currentQuestionId = question?.item ? getItemId(question.item) : null

    setQuestion(
      makeQuestion(
        nextItems,
        quizCountries,
        continents,
        quizType,
        currentQuestionId,
      ),
    )
    setSelectedAnswer('')
    setFeedback('')
    setWrongMapCountry(null)
    setWrongMapTerritory(null)
  }

  function resetQuiz() {
    const nextQuestionItems =
      quizType === 'flag'
        ? getFlagSessionItems(availableQuestionItems)
        : quizType === 'landmark'
          ? getLandmarkSessionItems(availableQuestionItems)
          : questionItems

    setCorrectAnswers(0)
    setWrongAnswers(0)
    setSelectedAnswer('')
    setFeedback('')
    setWrongMapCountry(null)
    setWrongMapTerritory(null)
    setAnsweredCorrectCountries([])
    setAnsweredCorrectTerritories([])
    setAnsweredCorrectLandmarks([])
    setAnsweredFlagItems([])
    if (quizType === 'flag') {
      setFlagSessionItems(nextQuestionItems)
    }
    if (quizType === 'landmark') {
      setLandmarkSessionItems(nextQuestionItems)
    }
    setFailedLandmarkImages({})
    setIsQuizFinished(false)
    setQuestion(
      makeQuestion(
        nextQuestionItems,
        quizCountries,
        continents,
        quizType,
      ),
    )
  }

  function restartMapContinent() {
    setAnsweredCorrectCountries([])
    setAnsweredCorrectTerritories([])
    setSelectedAnswer('')
    setFeedback('')
    setWrongMapCountry(null)
    setWrongMapTerritory(null)
    setIsQuizFinished(false)
    setAnsweredCorrectLandmarks([])
    setAnsweredFlagItems([])
    setFailedLandmarkImages({})
    setQuestion(
      makeQuestion(
        questionItems,
        quizCountries,
        continents,
        quizType,
      ),
    )
  }

  function changeQuiz() {
    const nextQuestionItems =
      quizType === 'flag'
        ? getFlagSessionItems(availableQuestionItems)
        : quizType === 'landmark'
          ? getLandmarkSessionItems(availableQuestionItems)
          : questionItems

    setCorrectAnswers(0)
    setWrongAnswers(0)
    setIsQuizFinished(false)
    setIsMapQuizOpen(false)
    setSelectedAnswer('')
    setFeedback('')
    setWrongMapCountry(null)
    setWrongMapTerritory(null)
    setAnsweredCorrectCountries([])
    setAnsweredCorrectTerritories([])
    setAnsweredCorrectLandmarks([])
    setAnsweredFlagItems([])
    if (quizType === 'flag') {
      setFlagSessionItems(nextQuestionItems)
    }
    if (quizType === 'landmark') {
      setLandmarkSessionItems(nextQuestionItems)
    }
    setFailedLandmarkImages({})
    setQuestion(
      makeQuestion(
        nextQuestionItems,
        quizCountries,
        continents,
        quizType,
      ),
    )
  }

  function returnHome() {
    setIsMapQuizOpen(false)
    onBackHome()
  }

  return (
    <section className="quiz-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Quiz</p>
          <h2>{t(selectedTypeQuestionKey)}</h2>
        </div>
        <div className="quiz-score">
          <p>{t('quiz.stats.correct')} : {correctAnswers}</p>
          <p>{t('quiz.stats.wrong')} : {wrongAnswers}</p>
          {isMapQuizType(quizType) && (
            <>
              <p>
                {t('quiz.stats.countriesDone')} : {mapStats.countriesDone}
                {quizType === 'map-mixed'
                  ? ` - ${t('quiz.stats.territoriesDone')} : ${mapStats.territoriesDone}`
                  : ''}
              </p>
              <p>{t('quiz.stats.remaining')} : {mapStats.remaining}</p>
            </>
          )}
          {quizType === 'landmark' && (
            <>
              <p>
                {t('quiz.stats.landmarkDone')} : {landmarkStats.done}/{landmarkStats.total}
              </p>
              <p>{t('quiz.stats.landmarkRemaining')} : {landmarkStats.remaining}</p>
            </>
          )}
          {quizType === 'flag' && (
            <>
              <p>
                {t('quiz.stats.flagDone')} : {flagStats.done} / {flagStats.total}
              </p>
              <p>{t('quiz.stats.flagRemaining')} : {flagStats.remaining}</p>
            </>
          )}
          <p>{t('common.score')} : {scorePercent} %</p>
        </div>
      </div>

      {isQuizFinished ? (
        <QuizEndScreen
          correctAnswers={correctAnswers}
          wrongAnswers={wrongAnswers}
          scorePercent={scorePercent}
          onRestart={resetQuiz}
          onChangeQuiz={changeQuiz}
          onBackHome={returnHome}
        />
      ) : (
        <>
      <div
        className={`quiz-card ${hasAnswered ? 'quiz-card-answered' : ''} ${
          quizType === 'landmark' ? 'quiz-card-landmark' : ''
        }`}
      >
        <div className="quiz-controls">
          <label>
            {t('quiz.controls.type')}
            <select
              value={quizType}
              onChange={(event) => setQuizType(event.target.value)}
            >
              {quizTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {getQuizTypeLabel(type.id)}
                </option>
              ))}
            </select>
          </label>

          {usesContinentFilter && (
            <label>
              {t('quiz.controls.continent')}
              <select
                value={quizContinent}
                onChange={(event) => setQuizContinent(event.target.value)}
              >
                {continentChoices.map((continent) => (
                  <option key={continent} value={continent}>
                    {continent === 'Tous les continents'
                      ? t('quiz.controls.allContinents')
                      : continent}
                  </option>
                ))}
              </select>
            </label>
          )}

          {quizType === 'smart-capital' && (
            <label>
              {t('quiz.controls.category')}
              <select
                value={smartCapitalCategory}
                onChange={(event) => setSmartCapitalCategory(event.target.value)}
              >
                {smartCapitalCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {question ? (
          <>
            {getQuestionVisual()}
            <p className="quiz-country">
              {quizType === 'flag'
                ? t('quiz.prompts.flag')
                : quizType === 'landmark'
                  ? t('quiz.prompts.landmark', { text: question.text })
                  : isMapQuizType(quizType)
                ? t('quiz.prompts.map', { text: question.text })
                : question.text}
            </p>
            {isMapQuizType(quizType) ? (
              <>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setIsMapQuizOpen(true)}
                >
                  {t('quiz.actions.startMap')}
                </button>
              </>
            ) : (
              <div className="answer-grid">
                {question.answers.map((answer) => (
                  <button
                    key={answer}
                    type="button"
                    className={
                      selectedAnswer === answer
                        ? answer === question.correctAnswer
                          ? 'correct'
                          : 'incorrect'
                        : ''
                    }
                    disabled={hasAnswered}
                    onClick={() => handleAnswer(answer)}
                  >
                    {answer}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="feedback">
            {quizType === 'landmark'
              ? t('quiz.feedback.noImage')
              : t('quiz.feedback.noShape')}
          </p>
        )}

        {!isMapQuizType(quizType) && feedback && <p className="feedback">{feedback}</p>}
        {!isMapQuizType(quizType) &&
          feedback &&
          quizType === 'smart-capital' &&
          question?.item && (
            <div className="quiz-correction-card">
              <p>
                <strong>{t('quiz.controls.category')} :</strong>{' '}
                {getSmartCapitalCategoryLabel(question.item.category)}
              </p>
              <p>
                <strong>{t('mapLearning.difficulty')} :</strong> {question.item.difficulty}
              </p>
              <p className="reference-sentence">
                <strong>{t('quiz.labels.clue')} :</strong> {question.item.clue}
              </p>
            </div>
          )}
        {!isMapQuizType(quizType) &&
          feedback &&
          question?.country &&
          quizType === 'flag' && (
            <div className="quiz-correction-card">
              <p>
                <strong>{t('mapLearning.country')} :</strong> {question.country.name}
              </p>
              <p>
                <strong>{t('common.capital')} :</strong> {question.country.capital}
              </p>
              <p className="mnemonic">
                <strong>{t('learn.labels.mnemonic')} :</strong> {question.country.mnemonic}
              </p>
            </div>
          )}

        <div className="quiz-actions">
          <button
            type="button"
            className="primary-button"
            disabled={!hasAnswered}
            onClick={goToNextQuestion}
          >
            {t('common.nextQuestion')}
          </button>
          <button type="button" className="secondary-button" onClick={resetQuiz}>
            {t('common.resetQuiz')}
          </button>
        </div>
      </div>

      {isMapQuizType(quizType) && isMapQuizOpen && question && (
        <QuizShapeMapOverlay
          countries={quizCountries}
          territories={quizTerritories}
          continent={quizContinent}
          quizType={quizType}
          question={question}
          hasAnswered={hasAnsweredCurrentMapQuestion}
          wrongCountry={wrongMapCountry}
          wrongTerritory={wrongMapTerritory}
          feedback={feedback}
          answeredCorrectItems={answeredCorrectItems}
          mapStats={mapStats}
          isFinished={isMapQuizFinished}
          scorePercent={scorePercent}
          onAnswerCountry={handleMapAnswer}
          onAnswerTerritory={handleMapTerritoryAnswer}
          onClose={() => {
            setIsMapQuizOpen(false)
            if (isMapQuizFinished) {
              setIsQuizFinished(true)
            }
          }}
          onNextQuestion={goToNextQuestion}
          onRestartContinent={restartMapContinent}
        />
      )}
        </>
      )}
    </section>
  )
}

export default Quiz
