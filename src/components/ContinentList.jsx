import { useLanguage } from '../context/LanguageContext'

function ContinentList({
  continents,
  continentProgress,
  selectedContinent,
  onSelectContinent,
}) {
  const { t } = useLanguage()

  return (
    <div>
      <h2>{t('learn.continents')}</h2>
      <div className="continent-list">
        {continents.map((continent) => (
          <button
            key={continent}
            type="button"
            className={continent === selectedContinent ? 'active' : ''}
            onClick={() => onSelectContinent(continent)}
          >
            <span>{continent}</span>
            <small>
              {t('learn.continentProgress', {
                known: continentProgress[continent].known,
                total: continentProgress[continent].total,
                percent: continentProgress[continent].percent,
              })}
            </small>
          </button>
        ))}
      </div>
    </div>
  )
}

export default ContinentList
