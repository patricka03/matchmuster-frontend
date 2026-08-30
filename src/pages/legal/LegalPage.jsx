import { useParams } from 'react-router-dom'
import BackButton from '../../components/BackButton'
import { legalDocuments } from '../../data/legalDocuments'
import './Legal.css'


function LegalPage() {
  const { document } = useParams()

  const legalDocument = legalDocuments[document]

  if (!legalDocument) {
    return (
      <main className="legal-page">
        <div className="legal-container">
          <h1 className="mm-page-title">Document not found</h1>

          <BackButton
            to="/legal"
            label="Back to Legal & Privacy"
          />
        </div>
      </main>
    )
  }

  return (
    <main className="legal-page">
      <div className="legal-container">
        <BackButton
          to="/legal"
          label="Back to Legal & Privacy"
        />

        <header className="legal-document-header">
          <h1 className="mm-page-title">{legalDocument.title}</h1>

          <div className="legal-meta">
            <span>Version {legalDocument.version}</span>
            <span>Effective {legalDocument.effectiveDate}</span>
          </div>
        </header>

        <div className="legal-content">
          {legalDocument.sections.map((section) => (
            <section key={section.title} className="legal-section">
              <h2>{section.title}</h2>

              {section.paragraphs?.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}

              {section.items && (
                <ul>
                  {section.items.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}

export default LegalPage
