import { useNavigate } from 'react-router-dom'
import '../styles/App.css'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">AI Care for Physical & Mental Health</p>
          <h1>Artificial intelligence to heal our world</h1>
          <p className="subtitle">
            Fuji36 helps companies offer smart, AI‑powered care for muscle and joint pain,
            pelvic health, movement health, and mental wellness — so their people can live
            better while reducing healthcare costs.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => navigate('/solutions')}>Start Offering Fuji36</button>
          </div>
          <p className="hero-footnote">
            Trusted by modern employers, health plans, and unions worldwide.
          </p>
        </div>
        <div className="hero-visual">
          <div className="hero-card">
            <h3>AI Care = Human Clinicians + AI</h3>
            <p>
              When human‑in‑the‑loop AI meets expert clinicians, care becomes more convenient,
              accessible, and scalable.
            </p>
            <ul>
              <li>On‑demand access to clinical specialists</li>
              <li>Personalized, adaptive care plans</li>
              <li>Secure, compliant, enterprise‑ready platform</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
