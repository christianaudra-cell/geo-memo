import { useLanguage } from '../context/LanguageContext'

function SmartReview({
  currentCountry,
  isReviewing,
  onStartReview,
  onMarkKnown,
  onMarkReview,
  onNextCountry,
  sessionStats,
  totalCountries,
}) {
  const { t } = useLanguage()

  if (!isReviewing) {
    return (
      <section className="single-view">
        <div className="review-panel">
          <p className="eyebrow">{t('review.eyebrow')}</p>
          <h2>{t('review.title')}</h2>
          <p>{t('review.intro')}</p>
          <button type="button" className="primary-button" onClick={onStartReview}>
            {t('review.start')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="single-view">
      <div className="review-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t('review.eyebrow')}</p>
            <h2>{currentCountry.name}</h2>
          </div>
          <div className="quiz-score">
            <p>{t('review.reviewed')} : {sessionStats.reviewed}</p>
            <p>{t('review.known')} : {sessionStats.known}</p>
            <p>{t('review.toReview')} : {sessionStats.review}</p>
          </div>
        </div>

        <article className="review-card">
          <p>
            <strong>{t('common.capital')} :</strong> {currentCountry.capital}
          </p>
          <p>
            <strong>{t('common.continent')} :</strong>{' '}
            {currentCountry.continent}
          </p>
          <p>
            <strong>{t('common.geography')} :</strong>{' '}
            {currentCountry.geography}
          </p>
          <p className="mnemonic">
            <strong>{t('learn.labels.mnemonic')} :</strong>{' '}
            {currentCountry.mnemonic}
          </p>
        </article>

        <div className="review-actions">
          <button type="button" onClick={onMarkKnown}>
            {t('common.known')}
          </button>
          <button type="button" className="review" onClick={onMarkReview}>
            {t('common.toReview')}
          </button>
          <button type="button" className="secondary-button" onClick={onNextCountry}>
            {t('common.next')}
          </button>
        </div>

        <p className="review-position">
          {t('review.cardPosition', {
            current: sessionStats.reviewed + 1,
            total: totalCountries,
          })}
        </p>
      </div>
    </section>
  )
}

export default SmartReview
