import { useEffect, useMemo, useState } from 'react'
import { divIcon } from 'leaflet'
import {
  MapContainer,
  Marker,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import CountryShapeMap, { hasCountryShape } from './CountryShapeMap'
import {
  getCountryPosition,
  getDistanceInKm,
  getLearningDetails,
} from '../data/learningDetails'
import { getCountriesForContinent } from '../data/europeCountryIds'
import {
  dependentTerritories,
  territoryStatusLabels,
} from '../data/dependentTerritories'
import { useLanguage } from '../context/LanguageContext'

const continentSettings = {
  Europe: { center: [50, 8], zoom: 4.45, tolerance: 450 },
  Afrique: { center: [2, 20], zoom: 3, tolerance: 900 },
  Asie: { center: [25, 135], zoom: 3, tolerance: 950 },
  Amérique: { center: [5, -75], zoom: 3, tolerance: 950 },
  Océanie: { center: [-22, 175], zoom: 4, tolerance: 1500 },
}

const difficultyLevels = {
  facile: { labelKey: 'mapLearning.difficultyLevels.easy', multiplier: 1.4 },
  normal: { labelKey: 'mapLearning.difficultyLevels.normal', multiplier: 1 },
  difficile: { labelKey: 'mapLearning.difficultyLevels.hard', multiplier: 0.6 },
}

const modeLabels = {
  explorer: 'mapLearning.modes.explorer',
  guided: 'mapLearning.modes.guided',
  practice: 'mapLearning.modes.practice',
  review: 'mapLearning.modes.review',
  rapid: 'mapLearning.modes.rapid',
}

const labelOffsets = [
  [0, 0],
  [0.45, 0.55],
  [-0.45, 0.55],
  [0.45, -0.55],
  [-0.45, -0.55],
  [0, 0.9],
  [0, -0.9],
]

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getCountryLabelIcon(countryName) {
  return divIcon({
    className: 'country-label-marker',
    html: `<span>${escapeHtml(countryName)}</span>`,
    iconAnchor: [60, 12],
    iconSize: [120, 24],
  })
}

function getTerritoryLabelIcon(territoryLabel) {
  return divIcon({
    className: 'territory-label-marker',
    html: `<span>${escapeHtml(territoryLabel)}</span>`,
    iconAnchor: [75, 12],
    iconSize: [150, 24],
  })
}

function getLabelPositionKey(position) {
  return `${Math.round(position[0] * 2) / 2}-${Math.round(position[1] * 2) / 2}`
}

function getExplorerLabelItems(countries) {
  const usedPositionCounts = {}

  return countries.map((country) => {
    const position = getCountryPosition(country)

    if (!position) {
      return {
        country,
        position: null,
      }
    }

    const positionKey = getLabelPositionKey(position)
    const offsetIndex = usedPositionCounts[positionKey] || 0
    const offset = labelOffsets[offsetIndex % labelOffsets.length]
    usedPositionCounts[positionKey] = offsetIndex + 1

    return {
      country,
      position: [position[0] + offset[0], position[1] + offset[1]],
    }
  })
}

function getProgressKey(country) {
  return `${country.continent}-${country.name}`
}

function getStatusLabel(status, t) {
  if (status === 'known') {
    return t('mapLearning.status.known')
  }

  if (status === 'review') {
    return t('mapLearning.status.review')
  }

  return t('mapLearning.status.unknown')
}

function shuffleCountries(countryList) {
  return [...countryList].sort(() => Math.random() - 0.5)
}

function sortForReview(countryList, countryProgress) {
  const scoreByStatus = {
    review: 0,
    unknown: 1,
    known: 2,
  }

  return [...countryList].sort((firstCountry, secondCountry) => {
    const firstStatus =
      countryProgress[getProgressKey(firstCountry)] || 'unknown'
    const secondStatus =
      countryProgress[getProgressKey(secondCountry)] || 'unknown'

    return scoreByStatus[firstStatus] - scoreByStatus[secondStatus]
  })
}

function MapFocus({ center, zoom }) {
  const map = useMap()

  useEffect(() => {
    const applyView = () => {
      map.invalidateSize()
      map.setView(center, zoom, { animate: false })
    }

    applyView()
    const resizeTimer = window.setTimeout(applyView, 150)

    return () => window.clearTimeout(resizeTimer)
  }, [center, map, zoom])

  return null
}

function MapClickHandler({ disabled, onClickMap }) {
  useMapEvents({
    click(event) {
      if (!disabled) {
        onClickMap([event.latlng.lat, event.latlng.lng])
      }
    },
  })

  return null
}

function MapView({
  countries,
  continents,
  selectedCountry,
  countryProgress,
  onChangeStatus,
}) {
  const { t } = useLanguage()
  const [selectedContinent, setSelectedContinent] = useState(
    selectedCountry?.continent || 'Europe',
  )
  const [mapMode, setMapMode] = useState('explorer')
  const [difficulty, setDifficulty] = useState('normal')
  const [selectedMapCountry, setSelectedMapCountry] = useState(selectedCountry)
  const [questionQueue, setQuestionQueue] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [guidedStep, setGuidedStep] = useState('learn')
  const [showGuidedReferences, setShowGuidedReferences] = useState(true)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [wrongCountry, setWrongCountry] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [wrongAnswers, setWrongAnswers] = useState(0)
  const [streak, setStreak] = useState(0)
  const [isGameFullscreen, setIsGameFullscreen] = useState(false)
  const [showTerritories, setShowTerritories] = useState(false)
  const [selectedMapTerritory, setSelectedMapTerritory] = useState(null)

  const continentCountries = useMemo(
    () =>
      getCountriesForContinent(countries, selectedContinent),
    [countries, selectedContinent],
  )
  const continentTerritories = useMemo(
    () =>
      dependentTerritories.filter(
        (territory) => territory.continent === selectedContinent,
      ),
    [selectedContinent],
  )
  const settings = continentSettings[selectedContinent]
  const tolerance = Math.round(
    settings.tolerance * difficultyLevels[difficulty].multiplier,
  )
  const knownInContinent = continentCountries.filter(
    (country) => countryProgress[getProgressKey(country)] === 'known',
  ).length
  const continentPercent =
    continentCountries.length === 0
      ? 0
      : Math.round((knownInContinent / continentCountries.length) * 100)
  const totalAnswers = correctAnswers + wrongAnswers
  const scorePercent =
    totalAnswers === 0 ? 0 : Math.round((correctAnswers / totalAnswers) * 100)
  const remainingCountries =
    questionQueue.length + (currentQuestion && !hasAnswered ? 1 : 0)
  const shouldShowTerritories = showTerritories && mapMode === 'explorer'
  const infoCountry = selectedMapTerritory
    ? null
    : selectedMapCountry || currentQuestion
  const learningDetails = infoCountry
    ? getLearningDetails(infoCountry, continentCountries)
    : null
  const infoStatus = infoCountry
    ? countryProgress[getProgressKey(infoCountry)]
    : undefined
  const correctPosition = currentQuestion
    ? getCountryPosition(currentQuestion)
    : null
  const fallbackCountries = continentCountries.filter(
    (country) => !hasCountryShape(country),
  )
  const explorerLabelItems = useMemo(
    () => getExplorerLabelItems(continentCountries),
    [continentCountries],
  )
  const territoryLabelItems = useMemo(
    () =>
      continentTerritories
        .filter((territory) => territory.position)
        .map((territory) => ({
          territory,
          position: territory.position,
        })),
    [continentTerritories],
  )
  const countriesWithoutExplorerLabel = useMemo(
    () =>
      explorerLabelItems
        .filter((labelItem) => !labelItem.position)
        .map((labelItem) => labelItem.country.name),
    [explorerLabelItems],
  )
  const guidedReferenceCountries =
    mapMode === 'guided' && currentQuestion
      ? getLearningDetails(currentQuestion, continentCountries).neighbors
          .slice(0, 4)
          .map((neighborName) =>
            continentCountries.find((country) => country.name === neighborName),
          )
          .filter(Boolean)
      : []
  const shouldShowGuidedReferences =
    mapMode === 'guided' &&
    guidedStep === 'learn' &&
    showGuidedReferences &&
    currentQuestion
  const selectedPosition = infoCountry ? getCountryPosition(infoCountry) : null
  const answerFocusPosition = hasAnswered && currentQuestion ? correctPosition : null
  const focusCenter =
    answerFocusPosition
      ? answerFocusPosition
      : mapMode === 'guided' && currentQuestion && correctPosition
        ? correctPosition
        : mapMode === 'explorer' && selectedPosition
          ? selectedPosition
          : settings.center
  const focusZoom =
    answerFocusPosition
      ? Math.max(settings.zoom + 2, 5)
      : mapMode === 'guided' && currentQuestion
        ? Math.max(settings.zoom + 1, 5)
        : mapMode === 'explorer' && selectedPosition
          ? 5
          : settings.zoom
  const isGameMode = mapMode !== 'explorer'

  useEffect(() => {
    if (mapMode === 'explorer' && countriesWithoutExplorerLabel.length > 0) {
      console.warn(
        '[MapView] Pays sans label Explorer:',
        countriesWithoutExplorerLabel,
      )
    }
  }, [countriesWithoutExplorerLabel, mapMode])

  function changeContinent(continent) {
    setSelectedContinent(continent)
    setSelectedMapCountry(null)
    setSelectedMapTerritory(null)
    setCurrentQuestion(null)
    setQuestionQueue([])
    setFeedback('')
    setHasAnswered(false)
    setWrongCountry(null)
    setCorrectAnswers(0)
    setWrongAnswers(0)
    setStreak(0)
    setMapMode('explorer')
    setIsGameFullscreen(false)
  }

  function startSession(nextMode) {
    const orderedCountries =
      nextMode === 'review' || nextMode === 'guided'
        ? sortForReview(continentCountries, countryProgress)
        : shuffleCountries(continentCountries)

    setMapMode(nextMode)
    setQuestionQueue(orderedCountries.slice(1))
    setCurrentQuestion(orderedCountries[0])
    setSelectedMapCountry(orderedCountries[0])
    setSelectedMapTerritory(null)
    setGuidedStep(nextMode === 'guided' ? 'learn' : 'test')
    setShowGuidedReferences(nextMode === 'guided')
    setHasAnswered(false)
    setWrongCountry(null)
    setFeedback('')
    setCorrectAnswers(0)
    setWrongAnswers(0)
    setStreak(0)
    setIsGameFullscreen(nextMode !== 'explorer')
  }

  function saveAnswer(isCorrect, message, clickedCountry = null) {
    setHasAnswered(true)
    setWrongCountry(isCorrect ? null : clickedCountry)
    setSelectedMapCountry(currentQuestion)
    setSelectedMapTerritory(null)

    if (isCorrect) {
      setCorrectAnswers(correctAnswers + 1)
      setStreak(streak + 1)
      onChangeStatus(currentQuestion, 'known')
      setFeedback(message)
    } else {
      setWrongAnswers(wrongAnswers + 1)
      setStreak(0)
      setQuestionQueue([...questionQueue, currentQuestion, currentQuestion])
      onChangeStatus(currentQuestion, 'review')
      setFeedback(message)
    }
  }

  function answerOnCountry(clickedCountry) {
    if (
      !currentQuestion ||
      hasAnswered ||
      guidedStep === 'learn'
    ) {
      return
    }

    const isCorrect = clickedCountry.name === currentQuestion.name

    if (isCorrect) {
      saveAnswer(
        true,
        t('mapLearning.feedback.correctCountryClick', {
          country: clickedCountry.name,
          mnemonic: currentQuestion.mnemonic,
        }),
      )
    } else {
      saveAnswer(
        false,
        t('mapLearning.feedback.wrongCountryClick', {
          clicked: clickedCountry.name,
          country: currentQuestion.name,
          mnemonic: currentQuestion.mnemonic,
        }),
        clickedCountry,
      )
    }
  }

  function answerOnMap(clickedPosition) {
    if (
      !currentQuestion ||
      hasAnswered ||
      !correctPosition ||
      guidedStep === 'learn' ||
      hasCountryShape(currentQuestion)
    ) {
      return
    }

    const distance = getDistanceInKm(clickedPosition, correctPosition)
    const isCorrect = distance <= tolerance

    if (isCorrect) {
      saveAnswer(
        true,
        t('mapLearning.feedback.correctDistance', {
          distance: Math.round(distance),
          mnemonic: currentQuestion.mnemonic,
        }),
      )
    } else {
      saveAnswer(
        false,
        t('mapLearning.feedback.wrongDistance', {
          mnemonic: currentQuestion.mnemonic,
        }),
      )
    }
  }

  function nextQuestion() {
    const nextCountry = questionQueue[0]

    setCurrentQuestion(nextCountry || null)
    setSelectedMapCountry(nextCountry || null)
    setSelectedMapTerritory(null)
    setQuestionQueue(questionQueue.slice(1))
    setGuidedStep(mapMode === 'guided' ? 'learn' : 'test')
    setShowGuidedReferences(mapMode === 'guided')
    setHasAnswered(false)
    setWrongCountry(null)
    setFeedback('')
  }

  function quitGameMode() {
    setIsGameFullscreen(false)
    setMapMode('explorer')
    setCurrentQuestion(null)
    setSelectedMapTerritory(null)
    setQuestionQueue([])
    setHasAnswered(false)
    setWrongCountry(null)
    setFeedback('')
  }

  return (
    <section
      className={`map-learning ${isGameFullscreen ? 'map-game-fullscreen' : ''}`}
    >
      {!isGameFullscreen && (
        <div className="map-learning-header">
        <div>
          <p className="eyebrow">{t('mapLearning.eyebrow')}</p>
          <h2>{t('mapLearning.title')}</h2>
          <p className="map-help">
            {t('mapLearning.help')}
          </p>
        </div>
        <div className="map-stats">
          <p>{t('common.score')} : {scorePercent} %</p>
          <p>{t('mapLearning.streak')} : {streak}</p>
          <p>{t('mapLearning.remainingCountries')} : {remainingCountries}</p>
          <p>
            {t('mapLearning.progressFor', { continent: selectedContinent })} : {knownInContinent}/
            {continentCountries.length} ({continentPercent} %)
          </p>
        </div>
      </div>
      )}

      {isGameFullscreen && isGameMode && currentQuestion && (
        <div className="map-game-hud">
          <div className="map-game-stat">
            <span>{t('common.score')}</span>
            <strong>{scorePercent} %</strong>
          </div>
          <div className="map-game-question">
            <span>{t(modeLabels[mapMode])}</span>
            <strong>{t('mapLearning.quiz.whereIs', { country: currentQuestion.name })}</strong>
          </div>
          <div className="map-game-stat">
            <span>{t('progress.title')}</span>
            <strong>
              {correctAnswers}/{totalAnswers || 0} - {t('mapLearning.quiz.remaining', { remaining: remainingCountries })}
            </strong>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsGameFullscreen(false)}
          >
            {t('mapLearning.normalMode')}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={quitGameMode}
          >
            {t('mapLearning.pauseQuit')}
          </button>
        </div>
      )}

      {!isGameFullscreen && (
        <div className="map-toolbar">
        <label>
          {t('common.continent')}
          <select
            value={selectedContinent}
            onChange={(event) => changeContinent(event.target.value)}
          >
            {continents.map((continent) => (
              <option key={continent} value={continent}>
                {continent}
              </option>
            ))}
          </select>
        </label>

        <label className="territory-toggle">
          <input
            type="checkbox"
            checked={showTerritories}
            onChange={(event) => {
              setShowTerritories(event.target.checked)
              setSelectedMapTerritory(null)
            }}
          />
          {showTerritories
            ? t('mapLearning.hideTerritories')
            : t('mapLearning.showTerritories')}
        </label>

        <label>
          {t('mapLearning.difficulty')}
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            {Object.entries(difficultyLevels).map(([key, level]) => (
              <option key={key} value={key}>
                {t(level.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <div className="map-mode-buttons" aria-label={t('mapLearning.mapMode')}>
          <button
            type="button"
            className={mapMode === 'explorer' ? 'active' : ''}
            onClick={() => {
              setMapMode('explorer')
              setFeedback('')
            }}
          >
            {t('mapLearning.modes.explorer')}
          </button>
          <button
            type="button"
            className={mapMode === 'guided' ? 'active' : ''}
            onClick={() => startSession('guided')}
          >
            {t('mapLearning.modes.guided')}
          </button>
          <button
            type="button"
            className={mapMode === 'practice' ? 'active' : ''}
            onClick={() => startSession('practice')}
          >
            {t('mapLearning.modes.practice')}
          </button>
          <button
            type="button"
            className={mapMode === 'review' ? 'active' : ''}
            onClick={() => startSession('review')}
          >
            {t('mapLearning.modes.review')}
          </button>
          <button
            type="button"
            className={mapMode === 'rapid' ? 'active' : ''}
            onClick={() => startSession('rapid')}
          >
            {t('mapLearning.modes.rapid')}
          </button>
        </div>
      </div>
      )}

      {!isGameFullscreen && fallbackCountries.length > 0 && (
        <p className="fallback-note">
          {t('mapLearning.approximateMarkers', {
            countries: fallbackCountries.map((country) => country.name).join(', '),
          })}
        </p>
      )}

      <div className="map-learning-layout">
        <div>
          {!isGameFullscreen && mapMode !== 'explorer' && currentQuestion && (
            <div className="map-quiz-panel">
              <div>
                <p className="eyebrow">{t(modeLabels[mapMode])}</p>
                <h3>
                  {mapMode === 'guided' && guidedStep === 'learn'
                    ? t('mapLearning.observe', { country: currentQuestion.name })
                    : t('mapLearning.clickLocation', { country: currentQuestion.name })}
                </h3>
              </div>
              <div className="map-quiz-score">
                <p>
                  {t('mapLearning.answers')} : {correctAnswers}/{totalAnswers}
                </p>
                <p>{t('mapLearning.tolerance')} : {tolerance} km</p>
              </div>
            </div>
          )}

          {mapMode === 'guided' && currentQuestion && guidedStep === 'learn' && (
            <article className="guided-card">
              <p className="eyebrow">{t('mapLearning.guidedClues')}</p>
              <ul>
                {getLearningDetails(currentQuestion, continentCountries).guidedClues.map(
                  (clue) => (
                    <li key={clue}>{clue}</li>
                  ),
                )}
              </ul>
              <p className="mnemonic">
                <strong>{t('learn.labels.mnemonic')} :</strong> {currentQuestion.mnemonic}
              </p>
              <p className="reference-sentence">
                {t('mapLearning.reference', {
                  neighbors: getLearningDetails(
                    currentQuestion,
                    continentCountries,
                  ).neighbors.join(', '),
                })}
              </p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowGuidedReferences(!showGuidedReferences)}
              >
                {showGuidedReferences
                  ? t('mapLearning.hideReferences')
                  : t('mapLearning.showReferences')}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setGuidedStep('test')
                  setShowGuidedReferences(false)
                  setFeedback('')
                  setHasAnswered(false)
                }}
              >
                {t('mapLearning.understood')}
              </button>
            </article>
          )}

          <div className="map-stage">
            <MapContainer
              key={`map-view-${selectedContinent}-${isGameFullscreen ? 'fullscreen' : 'normal'}`}
              center={settings.center}
              className="world-map map-learning-map"
              maxBounds={[
                [-85, -180],
                [85, 180],
              ]}
              maxBoundsViscosity={1}
              scrollWheelZoom
              wheelDebounceTime={25}
              wheelPxPerZoomLevel={80}
              worldCopyJump={false}
              zoom={settings.zoom}
            >
              <MapFocus center={focusCenter} zoom={focusZoom} />

            <CountryShapeMap
              countries={continentCountries}
              correctCountry={hasAnswered ? currentQuestion : null}
              highlightedCountries={
                shouldShowGuidedReferences ? guidedReferenceCountries : []
              }
              isQuizMode={mapMode !== 'explorer'}
              wrongCountry={wrongCountry}
              territories={shouldShowTerritories ? continentTerritories : []}
              countryProgress={countryProgress}
              onSelectCountry={(country) => {
                setSelectedMapTerritory(null)
                if (mapMode === 'explorer' || guidedStep === 'learn') {
                  setSelectedMapCountry(country)
                  return
                }

                answerOnCountry(country)
              }}
              onSelectTerritory={(territory) => {
                setSelectedMapCountry(null)
                setSelectedMapTerritory(territory)
              }}
            />

            {mapMode === 'explorer' &&
              explorerLabelItems
                .filter((labelItem) => labelItem.position)
                .map(({ country, position }) => (
                <Marker
                  key={`label-${country.name}`}
                  icon={getCountryLabelIcon(country.name)}
                  interactive={false}
                  keyboard={false}
                  position={position}
                  zIndexOffset={250}
                />
              ))}

            {shouldShowTerritories &&
              territoryLabelItems.map(({ territory, position }) => (
                <Marker
                  key={`territory-label-${territory.name}`}
                  icon={getTerritoryLabelIcon(territory.label)}
                  interactive={false}
                  keyboard={false}
                  position={position}
                  zIndexOffset={260}
                />
              ))}

            {mapMode === 'explorer' &&
              fallbackCountries.map((country) => (
                <Marker
                  key={country.name}
                  position={getCountryPosition(country)}
                  eventHandlers={{
                    click: () => setSelectedMapCountry(country),
                  }}
                >
                  <Popup>
                    <strong>{country.name}</strong>
                    <br />
                    {t('common.capital')} : {country.capital}
                  </Popup>
                </Marker>
              ))}

            {mapMode !== 'explorer' && currentQuestion && (
              <MapClickHandler
                disabled={
                  hasAnswered ||
                  guidedStep === 'learn' ||
                  hasCountryShape(currentQuestion)
                }
                onClickMap={answerOnMap}
              />
            )}

            {mapMode !== 'explorer' &&
              currentQuestion &&
              correctPosition &&
              !hasCountryShape(currentQuestion) &&
              (hasAnswered || (mapMode === 'guided' && guidedStep === 'learn')) && (
              <Marker position={correctPosition}>
                <Popup>
                  <strong>{currentQuestion.name}</strong>
                  <br />
                  {t('mapLearning.quiz.correctApprox')}
                </Popup>
              </Marker>
            )}

            {shouldShowGuidedReferences && correctPosition && (
              <>
                <CircleMarker
                  center={correctPosition}
                  pathOptions={{
                    color: '#0f766e',
                    fillColor: '#0f766e',
                    fillOpacity: 0.9,
                  }}
                  radius={12}
                >
                  <Popup>
                    <strong>{currentQuestion.name}</strong>
                    <br />
                    {t('mapLearning.quiz.countryToMemorize')}
                  </Popup>
                </CircleMarker>

                {guidedReferenceCountries
                  .filter((neighborCountry) => !hasCountryShape(neighborCountry))
                  .map((neighborCountry) => {
                  const neighborPosition = getCountryPosition(neighborCountry)

                  return (
                    <CircleMarker
                      key={neighborCountry.name}
                      center={neighborPosition}
                      pathOptions={{
                        color: '#f59e0b',
                        fillColor: '#f59e0b',
                        fillOpacity: 0.8,
                      }}
                      radius={8}
                    >
                      <Popup>
                        <strong>{neighborCountry.name}</strong>
                        <br />
                        {t('mapLearning.quiz.neighborReference')}
                      </Popup>
                    </CircleMarker>
                  )
                })}
              </>
            )}
            </MapContainer>

            <div className="map-legend" aria-label={t('mapLearning.legend')}>
              <span>
                <i className="legend-swatch country" />
                {t('mapLearning.country')}
              </span>
              <span>
                <i className="legend-swatch territory" />
                {t('mapLearning.territory')}
              </span>
              <span>
                <i className="legend-swatch validated" />
                {t('mapLearning.validated')}
              </span>
              <span>
                <i className="legend-swatch review" />
                {t('common.review')}
              </span>
            </div>
          </div>

          {mapMode !== 'explorer' && (
            <div className="map-quiz-actions">
              {feedback && <p className="feedback">{feedback}</p>}
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsGameFullscreen(!isGameFullscreen)}
              >
                {isGameFullscreen
                  ? t('mapLearning.normalMode')
                  : t('mapLearning.fullscreen')}
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={!hasAnswered || questionQueue.length === 0}
                onClick={nextQuestion}
              >
                {mapMode === 'rapid' ? t('common.next') : t('common.nextQuestion')}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={quitGameMode}
              >
                {t('common.close')}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => startSession(mapMode)}
              >
                {t('common.restart')}
              </button>
            </div>
          )}
        </div>

        <aside className="map-info-panel">
          {selectedMapTerritory ? (
            <>
              <p className="eyebrow">{t('mapLearning.infoPanel.territory')}</p>
              <h3>{selectedMapTerritory.label}</h3>
              <p>
                <strong>{t('mapLearning.infoPanel.attachment')} :</strong>{' '}
                {selectedMapTerritory.parentCountry}
              </p>
              <p>
                <strong>{t('mapLearning.infoPanel.status')} :</strong>{' '}
                {territoryStatusLabels[selectedMapTerritory.politicalStatus]}
              </p>
              <p>
                <strong>{t('mapLearning.infoPanel.region')} :</strong>{' '}
                {selectedMapTerritory.continent}
              </p>
              <p>{selectedMapTerritory.geography}</p>
              <p className="territory-note">
                {t('mapLearning.infoPanel.territoryNote')}
              </p>
            </>
          ) : infoCountry ? (
            <>
              <p className="eyebrow">{t('mapLearning.infoPanel.quickCard')}</p>
              <h3>{infoCountry.name}</h3>
              {learningDetails.neighbors.length > 0 && (
                <p className="reference-sentence">
                  {t('mapLearning.reference', {
                    neighbors: learningDetails.neighbors.join(', '),
                  })}
                </p>
              )}
              <p>
                <strong>{t('common.capital')} :</strong> {infoCountry.capital}
              </p>
              <p>
                <strong>{t('common.continent')} :</strong> {infoCountry.continent}
              </p>
              <p className={`status-pill ${infoStatus || 'unknown'}`}>
                {t('mapLearning.infoPanel.state')} : {getStatusLabel(infoStatus, t)}
              </p>
              <div className="card-actions">
                <button
                  type="button"
                  className={`known-action ${
                    infoStatus === 'known' ? 'active' : ''
                  }`}
                  disabled={!infoCountry}
                  onClick={() => infoCountry && onChangeStatus(infoCountry, 'known')}
                >
                  {t('common.known')}
                </button>
                <button
                  type="button"
                  className={`review-action ${
                    infoStatus === 'review' ? 'active' : ''
                  }`}
                  disabled={!infoCountry}
                  onClick={() => infoCountry && onChangeStatus(infoCountry, 'review')}
                >
                  {t('common.review')}
                </button>
              </div>
              <p>
                <strong>{t('mapLearning.infoPanel.closeNeighbors')} :</strong>{' '}
                {learningDetails.neighbors.join(', ')}
              </p>
              <p>
                <strong>{t('mapLearning.infoPanel.relativePosition')} :</strong>{' '}
                {learningDetails.relativePosition}
              </p>
              <p>
                <strong>{t('common.type')} :</strong> {learningDetails.geoType}
              </p>
              <p className="mnemonic">
                <strong>{t('learn.labels.mnemonic')} :</strong> {infoCountry.mnemonic}
              </p>
            </>
          ) : (
            <p>{t('mapLearning.infoPanel.clickMarker')}</p>
          )}
        </aside>
      </div>

      {isGameFullscreen && hasAnswered && currentQuestion && (
        <aside className="map-answer-overlay">
          <p className="eyebrow">
            {wrongCountry
              ? t('mapLearning.quiz.correction')
              : t('mapLearning.quiz.goodAnswer')}
          </p>
          <h3>{currentQuestion.name}</h3>
          <p>
            <strong>{t('common.capital')} :</strong> {currentQuestion.capital}
          </p>
          <p className="mnemonic">
            <strong>{t('learn.labels.mnemonic')} :</strong> {currentQuestion.mnemonic}
          </p>
          <p>
            <strong>{t('mapLearning.infoPanel.relativePosition')} :</strong>{' '}
            {getLearningDetails(currentQuestion, continentCountries).relativePosition}
          </p>
          <p>
            <strong>{t('mapLearning.infoPanel.closeNeighbors')} :</strong>{' '}
            {getLearningDetails(currentQuestion, continentCountries).neighbors.join(
              ', ',
            )}
          </p>
          {feedback && <p className="feedback">{feedback}</p>}
          <button
            type="button"
            className="primary-button"
            disabled={questionQueue.length === 0}
            onClick={nextQuestion}
          >
            {t('common.nextQuestion')}
          </button>
        </aside>
      )}
    </section>
  )
}

export default MapView
