import { useLanguage } from '../context/LanguageContext'
import { getLearningDetails } from '../data/learningDetails'

function CountryCard({
  country,
  countries,
  status,
  onChangeStatus,
  onSelectCountry,
}) {
  const { t } = useLanguage()
  const learningDetails = getLearningDetails(country, countries)

  return (
    <article
      className="country-card"
      tabIndex="0"
      onClick={() => onSelectCountry(country)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onSelectCountry(country)
        }
      }}
    >
      <div>
        <p className="continent-label">{country.continent}</p>
        <h3>{country.name}</h3>
      </div>
      <p>
        <strong>{t('common.capital')} :</strong> {country.capital}
      </p>
      <p>
        <strong>{t('common.geography')} :</strong> {country.geography}
      </p>
      <p>
        <strong>{t('learn.labels.neighbors')} :</strong>{' '}
        {learningDetails.neighbors.join(', ')}
      </p>
      <p>
        <strong>{t('common.position')} :</strong>{' '}
        {learningDetails.relativePosition}
      </p>
      <p>
        <strong>{t('common.type')} :</strong> {learningDetails.geoType}
      </p>
      <p className="mnemonic">
        <strong>{t('learn.labels.mnemonic')} :</strong> {country.mnemonic}
      </p>
      <div className="card-actions">
        <button
          type="button"
          className={status === 'known' ? 'active' : ''}
          onClick={(event) => {
            event.stopPropagation()
            onChangeStatus(country, 'known')
          }}
        >
          {t('common.known')}
        </button>
        <button
          type="button"
          className={status === 'review' ? 'active review' : 'review'}
          onClick={(event) => {
            event.stopPropagation()
            onChangeStatus(country, 'review')
          }}
        >
          {t('common.review')}
        </button>
      </div>
    </article>
  )
}

export default CountryCard
