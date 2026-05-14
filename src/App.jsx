import { useEffect, useMemo, useState } from 'react'
import './App.css'
import ContinentList from './components/ContinentList'
import CountryCard from './components/CountryCard'
import FeedbackForm from './components/FeedbackForm'
import MapView from './components/MapView'
import Quiz from './components/Quiz'
import SmartReview from './components/SmartReview'
import { useLanguage } from './context/LanguageContext'
import { countries } from './data/countries'

const continents = ['Europe', 'Afrique', 'Asie', 'Amérique', 'Océanie']
const progressStorageKey = 'geo-memo-progress'
const filters = ['all', 'known', 'review']
const navigationModules = [
  {
    view: 'Carte',
    icon: '🌍',
    titleKey: 'nav.map',
    descriptionKey: 'nav.mapDescription',
    tone: 'map',
  },
  {
    view: 'Apprendre',
    icon: '🧠',
    titleKey: 'nav.learn',
    descriptionKey: 'nav.learnDescription',
    tone: 'learn',
  },
  {
    view: 'Révision',
    icon: '⚡',
    titleKey: 'nav.review',
    descriptionKey: 'nav.reviewDescription',
    tone: 'review',
  },
  {
    view: 'Quiz',
    icon: '🎯',
    titleKey: 'nav.quiz',
    descriptionKey: 'nav.quizDescription',
    tone: 'quiz',
  },
  {
    view: 'Progression',
    icon: '📈',
    titleKey: 'nav.progress',
    descriptionKey: 'nav.progressDescription',
    tone: 'progress',
  },
]
const scoreByStatus = {
  review: 0,
  unknown: 1,
  known: 2,
}
const progressKeyAliases = {
  'Afrique-Congo': 'Afrique-République du Congo',
  'Afrique-Congo (Brazzaville)': 'Afrique-République du Congo',
  'Afrique-Congo (Kinshasa)': 'Afrique-République démocratique du Congo',
}

function getCountryKey(country) {
  return `${country.continent}-${country.name}`
}

function migrateProgressKeys(progress) {
  return Object.entries(progress).reduce((migratedProgress, [key, status]) => {
    const nextKey = progressKeyAliases[key] || key

    migratedProgress[nextKey] = status

    return migratedProgress
  }, {})
}

function loadSavedProgress() {
  const savedProgress = localStorage.getItem(progressStorageKey)

  if (!savedProgress) {
    return {}
  }

  try {
    return migrateProgressKeys(JSON.parse(savedProgress))
  } catch {
    return {}
  }
}

function App() {
  const { t, toggleLanguage } = useLanguage()
  const [activeView, setActiveView] = useState('Accueil')
  const [selectedContinent, setSelectedContinent] = useState('Europe')
  const [searchTerm, setSearchTerm] = useState('')
  const [progressFilter, setProgressFilter] = useState('all')
  const [countryProgress, setCountryProgress] = useState(loadSavedProgress)
  const [selectedCountry, setSelectedCountry] = useState(countries[0])
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    known: 0,
    review: 0,
  })

  useEffect(() => {
    localStorage.setItem(progressStorageKey, JSON.stringify(countryProgress))
  }, [countryProgress])

  function updateCountryProgress(country, status) {
    setCountryProgress({
      ...countryProgress,
      [getCountryKey(country)]: status,
    })
  }

  function selectCountryOnMap(country) {
    setSelectedCountry(country)
    setActiveView('Carte')
  }

  function resetProgress() {
    const shouldReset = confirm(t('progress.resetConfirm'))

    if (shouldReset) {
      setCountryProgress({})
    }
  }

  function startReview() {
    setIsReviewing(true)
    setReviewIndex(0)
    setSessionStats({
      reviewed: 0,
      known: 0,
      review: 0,
    })
  }

  function goToNextReviewCountry() {
    setReviewIndex((reviewIndex + 1) % reviewCountries.length)
  }

  function markReviewCountry(status) {
    const currentCountry = reviewCountries[reviewIndex]

    updateCountryProgress(currentCountry, status)
    setSessionStats({
      reviewed: sessionStats.reviewed + 1,
      known: status === 'known' ? sessionStats.known + 1 : sessionStats.known,
      review:
        status === 'review' ? sessionStats.review + 1 : sessionStats.review,
    })
    goToNextReviewCountry()
  }

  const continentProgress = useMemo(() => {
    return continents.reduce((summary, continent) => {
      const continentCountries = countries.filter(
        (country) => country.continent === continent,
      )
      const knownCountries = continentCountries.filter(
        (country) => countryProgress[getCountryKey(country)] === 'known',
      )
      const total = continentCountries.length
      const known = knownCountries.length

      summary[continent] = {
        known,
        total,
        percent: total === 0 ? 0 : Math.round((known / total) * 100),
      }

      return summary
    }, {})
  }, [countryProgress])

  const globalProgress = useMemo(() => {
    const total = countries.length
    const known = countries.filter(
      (country) => countryProgress[getCountryKey(country)] === 'known',
    ).length
    const review = countries.filter(
      (country) => countryProgress[getCountryKey(country)] === 'review',
    ).length

    return {
      total,
      known,
      review,
      percent: total === 0 ? 0 : Math.round((known / total) * 100),
    }
  }, [countryProgress])

  const selectedProgress = continentProgress[selectedContinent]

  const visibleCountries = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase()

    return countries.filter((country) => {
      const countryStatus = countryProgress[getCountryKey(country)]
      const matchesContinent = country.continent === selectedContinent
      const matchesSearch =
        country.name.toLowerCase().includes(cleanSearch) ||
        country.capital.toLowerCase().includes(cleanSearch)
      const matchesProgress =
        progressFilter === 'all' ||
        (progressFilter === 'known' && countryStatus === 'known') ||
        (progressFilter === 'review' && countryStatus !== 'known')

      return matchesContinent && matchesSearch && matchesProgress
    })
  }, [countryProgress, progressFilter, searchTerm, selectedContinent])

  const reviewCountries = useMemo(() => {
    return [...countries].sort((firstCountry, secondCountry) => {
      const firstStatus =
        countryProgress[getCountryKey(firstCountry)] || 'unknown'
      const secondStatus =
        countryProgress[getCountryKey(secondCountry)] || 'unknown'

      return scoreByStatus[firstStatus] - scoreByStatus[secondStatus]
    })
  }, [countryProgress])

  const currentReviewCountry = reviewCountries[reviewIndex] || reviewCountries[0]
  const activeModule = navigationModules.find(
    (module) => module.view === activeView,
  )
  const isHomeView = activeView === 'Accueil'

  return (
    <main className={`app ${isHomeView ? 'home-screen' : 'app-module-shell'}`}>
      {isHomeView && (
        <>
      <header className="app-header">
        <div>
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1>Geo Mémo</h1>
          <p className="intro">{t('home.intro')}</p>
        </div>
        <div className="hero-score-card" aria-label={t('progress.global')}>
          <span>{t('home.worldScore')}</span>
          <strong>{globalProgress.percent} %</strong>
          <small>
            {t('home.masteredCountries', {
              known: globalProgress.known,
              total: globalProgress.total,
            })}
          </small>
        </div>
        <button
          type="button"
          className="language-toggle"
          aria-label={t('language.aria')}
          onClick={toggleLanguage}
        >
          {t('language.toggle')}
        </button>
      </header>

      <nav className="app-nav" aria-label={t('home.mainNavigation')}>
        <p className="mode-picker-title">{t('home.modePicker')}</p>
        <div className="mode-card-grid">
          {navigationModules.map((module) => (
          <button
            key={module.view}
            type="button"
            className={`mode-card ${module.tone} ${
              module.view === activeView ? 'active' : ''
            }`}
            onClick={() => setActiveView(module.view)}
          >
            <span className="mode-card-icon" aria-hidden="true">
              {module.icon}
            </span>
            <span className="mode-card-copy">
              <strong>{t(module.titleKey)}</strong>
              <small>{t(module.descriptionKey)}</small>
            </span>
          </button>
          ))}
        </div>
      </nav>

      {isHomeView && (
        <aside className="contact-card" aria-label={t('home.contactEyebrow')}>
          <div className="contact-card-copy">
            <p className="eyebrow">{t('home.contactEyebrow')}</p>
            <h2>{t('home.contactTitle')}</h2>
            <p>{t('home.contactIntro')}</p>
          </div>
          <FeedbackForm />
        </aside>
      )}
        </>
      )}

      {!isHomeView && (
        <section
          className={`module-view module-view-${activeModule?.tone || 'default'}`}
        >
          <header className="module-header">
            <button
              type="button"
              className="module-back-button"
              onClick={() => setActiveView('Accueil')}
            >
              {t('common.backHome')}
            </button>
            <div>
              <p className="eyebrow">{t('common.gameMode')}</p>
              <h1>
                <span aria-hidden="true">{activeModule?.icon}</span>{' '}
                {activeModule ? t(activeModule.titleKey) : activeView}
              </h1>
              <p>{activeModule ? t(activeModule.descriptionKey) : ''}</p>
            </div>
          </header>

          <div className="module-content">
      {activeView === 'Apprendre' && (
        <section className="study-layout">
          <aside className="continent-panel" aria-label={t('learn.chooseContinent')}>
            <ContinentList
              continents={continents}
              continentProgress={continentProgress}
              selectedContinent={selectedContinent}
              onSelectContinent={setSelectedContinent}
            />
          </aside>

          <section className="country-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t('learn.countrySheets')}</p>
                <h2>{selectedContinent}</h2>
                <p className="progress-summary">
                  {t('learn.progressSummary', selectedProgress)}
                </p>
              </div>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('learn.searchPlaceholder')}
                aria-label={t('learn.searchPlaceholder')}
              />
            </div>

            <div className="filter-list" aria-label={t('learn.filterCountries')}>
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={filter === progressFilter ? 'active' : ''}
                  onClick={() => setProgressFilter(filter)}
                >
                  {t(
                    filter === 'all'
                      ? 'learn.filters.all'
                      : filter === 'known'
                        ? 'learn.filters.known'
                        : 'learn.filters.review',
                  )}
                </button>
              ))}
            </div>

            <div className="country-grid">
              {visibleCountries.map((country) => (
                <CountryCard
                  key={country.name}
                  country={country}
                  countries={countries}
                  status={countryProgress[getCountryKey(country)]}
                  onChangeStatus={updateCountryProgress}
                  onSelectCountry={selectCountryOnMap}
                />
              ))}
            </div>

            {visibleCountries.length === 0 && (
              <p className="empty-message">
                {t('learn.empty')}
              </p>
            )}
          </section>
        </section>
      )}

      {activeView === 'Quiz' && (
        <Quiz
          countries={countries}
          continents={continents}
          onBackHome={() => setActiveView('Accueil')}
        />
      )}

      {activeView === 'Révision' && (
        <SmartReview
          currentCountry={currentReviewCountry}
          isReviewing={isReviewing}
          sessionStats={sessionStats}
          totalCountries={reviewCountries.length}
          onMarkKnown={() => markReviewCountry('known')}
          onMarkReview={() => markReviewCountry('review')}
          onNextCountry={goToNextReviewCountry}
          onStartReview={startReview}
        />
      )}

      {activeView === 'Carte' && (
        <section className="single-view">
          <MapView
            key={selectedCountry.name}
            countries={countries}
            continents={continents}
            countryProgress={countryProgress}
            selectedCountry={selectedCountry}
            onChangeStatus={updateCountryProgress}
          />
        </section>
      )}

      {activeView === 'Progression' && (
        <section className="single-view">
          <div className="dashboard">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t('progress.eyebrow')}</p>
                <h2>{t('progress.title')}</h2>
              </div>
              <button
                type="button"
                className="danger-button"
                onClick={resetProgress}
              >
                {t('progress.reset')}
              </button>
            </div>

            <div className="stats-grid">
              <article>
                <p>{t('progress.totalCountries')}</p>
                <strong>{globalProgress.total}</strong>
              </article>
              <article>
                <p>{t('progress.countriesKnown')}</p>
                <strong>{globalProgress.known}</strong>
              </article>
              <article>
                <p>{t('progress.countriesToReview')}</p>
                <strong>{globalProgress.review}</strong>
              </article>
              <article>
                <p>{t('progress.global')}</p>
                <strong>{globalProgress.percent} %</strong>
              </article>
            </div>

            <div className="progress-bar" aria-label={t('progress.global')}>
              <span style={{ width: `${globalProgress.percent}%` }}></span>
            </div>

            <div className="continent-progress-grid">
              {continents.map((continent) => (
                <article key={continent}>
                  <div>
                    <h3>{continent}</h3>
                    <p>
                      {t('progress.knownShort', {
                        known: continentProgress[continent].known,
                        total: continentProgress[continent].total,
                      })}
                    </p>
                  </div>
                  <strong>{continentProgress[continent].percent} %</strong>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
          </div>
        </section>
      )}
    </main>
  )
}

export default App
