//import { useNavigate } from 'react-router-dom'
import '../styles/App.css'

export default function AboutPage() {
  /*const navigate = useNavigate()

  const handleLoginClick = () => {
    navigate('/login', { state: { from: window.location.pathname } })
  }*/

  return (
    <div className="page-container">
      <section className="section cta">
        <h1>A life free of pain starts here.</h1>
        <p className="section-intro">
          Join the organizations using Fuji36 to help their people feel better and reduce
          healthcare costs.
        </p>
        <div className="hero-actions">
          <button className="primary">Contact sales</button>
        </div>
      </section>

      <section className="section about-content">
        <h2>About Fuji36</h2>
        <p className="section-intro">
          We're on a mission to make world‑class healthcare accessible to everyone through
          the power of AI and human expertise.
        </p>
        <div className="platform-grid">
          <div className="platform-card">
            <h3>Our mission</h3>
            <p>
              To democratize access to expert clinical care by combining artificial intelligence
              with licensed healthcare professionals, making personalized treatment available
              to everyone, everywhere.
            </p>
          </div>
          <div className="platform-card">
            <h3>Clinical excellence</h3>
            <p>
              Every program is led by licensed clinicians and backed by peer‑reviewed research,
              ensuring evidence‑based care that delivers real outcomes.
            </p>
          </div>
          <div className="platform-card">
            <h3>Transparent pricing</h3>
            <p>
              Outcome‑based pricing means you only pay for results. No hidden fees, no surprises —
              just fair, transparent pricing tied to real health outcomes.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
