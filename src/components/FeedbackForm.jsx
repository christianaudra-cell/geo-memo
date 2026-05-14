import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

function FeedbackForm() {
  const { t } = useLanguage()
  const [hasSubmittedContact, setHasSubmittedContact] = useState(false)
  const [contactError, setContactError] = useState('')

  function handleContactSubmit(event) {
    const formData = new FormData(event.currentTarget)
    const message = String(formData.get('message') || '')
    const blockedTerms = ['http', 'www', '.com']
    const hasBlockedTerm = blockedTerms.some((term) =>
      message.toLowerCase().includes(term),
    )

    if (message.length > 500) {
      event.preventDefault()
      setHasSubmittedContact(false)
      setContactError(t('contact.tooLong'))
      return
    }

    if (hasBlockedTerm) {
      event.preventDefault()
      setHasSubmittedContact(false)
      setContactError(t('contact.noLinks'))
      return
    }

    setContactError('')
    setHasSubmittedContact(true)
  }

  return (
    <>
      <iframe
        className="contact-form-target"
        name="contact-form-target"
        title={t('contact.frameTitle')}
      />
      <form
        action="https://formspree.io/f/xwvyqpzo"
        className="contact-form"
        method="POST"
        target="contact-form-target"
        onSubmit={handleContactSubmit}
      >
        <input type="text" name="_gotcha" style={{ display: 'none' }} />
        <input name="name" type="text" placeholder={t('contact.name')} />
        <input
          name="email"
          type="email"
          placeholder={t('contact.email')}
          required
        />
        <textarea
          name="message"
          placeholder={t('contact.message')}
          required
          rows="4"
        />
        <button type="submit">{t('contact.submit')}</button>
        {contactError && <p className="contact-error">{contactError}</p>}
        {hasSubmittedContact && (
          <p className="contact-success">{t('contact.success')}</p>
        )}
      </form>
    </>
  )
}

export default FeedbackForm
