import '../styles/App.css'

export default function WhoWeServePage() {
  return (
    <div className="page-container">
      <section className="section who-we-serve">
        <h1>Who we serve</h1>
        <p className="section-intro">
          Fuji36 partners with organizations across industries to deliver world‑class care
          and measurable outcomes for their people.
        </p>
        <div className="who-grid">
          <div className="who-card">
            <h3>Employers</h3>
            <p>Solutions that deliver for you and your employees.</p>
            <p>
              Help your workforce stay healthy, productive, and engaged with AI‑powered care
              that reduces healthcare costs and improves outcomes.
            </p>
          </div>
          <div className="who-card">
            <h3>Health plans</h3>
            <p>Smarter health plans choose Fuji36.</p>
            <p>
              Deliver better member experiences while reducing medical spend through proven
              clinical outcomes and transparent pricing.
            </p>
          </div>
          <div className="who-card">
            <h3>Unions</h3>
            <p>Stronger support and better outcomes for your members.</p>
            <p>
              Provide comprehensive care solutions that prioritize member health and reduce
              long‑term healthcare costs.
            </p>
          </div>
          <div className="who-card">
            <h3>Individuals</h3>
            <p>On‑demand access to AI‑powered care specialists.</p>
            <p>
              Get personalized care plans, expert guidance, and track your progress — all from
              the comfort of your home.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
