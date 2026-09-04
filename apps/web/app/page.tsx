const stages = [
  ["01", "Creative brief", "Obiettivo, formato, pubblico e vincoli."],
  ["02", "Director plan", "Bibbia, scene, shot e mappa di continuità."],
  ["03", "Review", "Modifica e approva prima di produrre qualsiasi asset."],
  ["04", "Production", "Job tracciabili per gli strumenti creativi che sceglierai."]
];

export default function Home() {
  return <main>
    <nav><span className="brand">AI VIDEO DIRECTOR</span><span className="pill">MVP · planning first</span></nav>
    <section className="hero">
      <p className="eyebrow">THE PRODUCTION WORKSPACE</p>
      <h1>Dall’idea a un piano video che il tuo team può davvero produrre.</h1>
      <p className="lead">Progetta il film. Mantieni coerenza fra personaggi, scene e shot. Collega i generatori solo quando il piano è pronto.</p>
      <div className="actions"><a className="primary" href="/projects/new">Nuovo progetto</a><a href="#flow">Vedi il flusso</a></div>
    </section>
    <section id="flow" className="stages">{stages.map(([number, title, description]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{description}</p></article>)}</section>
    <section className="notice"><strong>Fondazione pronta.</strong> Il prossimo passo è costruire il primo flusso verticale: progetto, brief e piano dimostrativo.</section>
  </main>;
}
