import '../styles/App.css'

export default function ValuePage() {
  return (
    <div className="page-container">
      <section className="section value">
        <h1>Customer savings delivered to date</h1>
        <p className="section-intro">
          By helping members avoid surgery, ER visits, and painkillers, Fuji36 drastically
          reduces medical spending through unmatched clinical outcomes.
        </p>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">3.2:1</div>
            <div className="stat-label">Independently validated gross savings ratio</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">$3,177</div>
            <div className="stat-label">Average savings per engaged member per year</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">50%</div>
            <div className="stat-label">Reduction in rate of costly surgeries</div>
          </div>
        </div>
      </section>

      <section className="section proof">
        <h2>The proof is in the results</h2>
        <p className="section-intro">
          Real outcomes from real members — validated by independent research and peer‑reviewed
          clinical studies.
        </p>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">67%</div>
            <div className="stat-label">of members pain free by end of program</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">64%</div>
            <div className="stat-label">reduction in depression symptoms</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">68%</div>
            <div className="stat-label">improvement in productivity</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">83</div>
            <div className="stat-label">Net Promoter Score</div>
          </div>
        </div>
      </section>
    </div>
  )
}
