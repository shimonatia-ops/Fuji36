import '../styles/App.css'

export default function InsightsPage() {
  return (
    <div className="page-container">
      <section className="section insights">
        <h1>Insights</h1>
        <p className="section-intro">
          Evidence‑based reports, customer stories, and clinical studies to guide smarter
          care decisions.
        </p>
        <div className="insights-grid">
          <article className="insight-card">
            <h3>How fully insured plans are cutting MSK costs</h3>
            <p>
              A deep dive into how AI‑driven care pathways reduce unnecessary surgeries and
              chronic pain spend.
            </p>
            <button className="link-button">Read whitepaper</button>
          </article>
          <article className="insight-card">
            <h3>National deployment of clinically led AI care</h3>
            <p>
              A milestone in bringing clinically validated AI into national healthcare systems.
            </p>
            <button className="link-button">Read story</button>
          </article>
          <article className="insight-card">
            <h3>MindEval: Evaluating AI in mental health</h3>
            <p>
              A rigorous framework for assessing large language models in mental health
              contexts.
            </p>
            <button className="link-button">Learn more</button>
          </article>
          <article className="insight-card">
            <h3>Clinical outcomes and member satisfaction</h3>
            <p>
              Comprehensive analysis of treatment effectiveness and patient experience across
              our care programs.
            </p>
            <button className="link-button">View report</button>
          </article>
          <article className="insight-card">
            <h3>ROI analysis for employers</h3>
            <p>
              Detailed breakdown of cost savings and productivity gains for organizations
              implementing Fuji36.
            </p>
            <button className="link-button">Download study</button>
          </article>
          <article className="insight-card">
            <h3>Patient success stories</h3>
            <p>
              Real stories from members who have transformed their health and quality of life
              through our programs.
            </p>
            <button className="link-button">Read stories</button>
          </article>
        </div>
      </section>
    </div>
  )
}
