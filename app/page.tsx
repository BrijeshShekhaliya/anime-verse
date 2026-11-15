const features = [
  {
    number: "01",
    title: "Find your next favourite",
    copy: "Explore anime by mood, genre and popularity. Spend less time searching and more time watching.",
    icon: "✳",
  },
  {
    number: "02",
    title: "A player made for anime",
    copy: "A focused viewing experience with playback controls designed to stay out of your way.",
    icon: "▶",
  },
  {
    number: "03",
    title: "Your audio, your choice",
    copy: "Switch between available audio tracks and make each show feel right for you.",
    icon: "♫",
  },
];

const steps = [
  ["01", "Download", "Get the Anime - Vers Android app."],
  ["02", "Discover", "Find a series you feel like watching."],
  ["03", "Press play", "Settle in and enjoy your next episode."],
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Anime - Vers home">
          <span className="brand-mark">A<span>V</span></span>
          <span>ANIME <b>- VERS</b></span>
        </a>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a className="button button-small button-outline" href="#download">Get the app <span>↗</span></a>
      </header>

      <section className="hero section-wrap" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> MADE FOR ANIME FANS</div>
          <h1>Your next anime<br />is <em>one tap</em> away.</h1>
          <p className="hero-description">Meet Anime - Vers. A smoother place to discover the shows you love and enjoy them on your phone.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="/downloads/anime-vers.apk" download>
              <span className="download-icon">↓</span>
              Download for Android
            </a>
            <a className="text-link" href="#features">Explore the app <span>→</span></a>
          </div>
          <div className="hero-note"><span className="check">✓</span> Android app <span className="note-divider">·</span> Download link will be updated here</div>
        </div>
        <div className="hero-art" aria-label="Illustrative preview of the Anime - Vers mobile app">
          <div className="art-glow" />
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="phone phone-back">
            <div className="phone-screen back-screen">
              <div className="mock-top"><span>ANIME - VERS</span><span>⌕</span></div>
              <div className="mock-poster poster-one"><small>FEATURED SERIES</small><b>THE<br/>NEW<br/>WORLD</b></div>
              <div className="mock-lines"><i/><i/><i/></div>
              <div className="mock-row"><i/><i/><i/></div>
            </div>
          </div>
          <div className="phone phone-front">
            <div className="phone-camera" />
            <div className="phone-screen">
              <div className="mock-top"><span className="mock-brand">A<span>V</span> ANIME - VERS</span><span>⌕</span></div>
              <div className="mock-greeting">YOUR NEXT OBSESSION</div>
              <div className="mock-poster poster-two"><small>NOW DISCOVERING</small><b>BEYOND<br/>THE<br/>STARS</b><span>EXPLORE THE UNKNOWN</span></div>
              <div className="mock-section-title">Picked for you <span>See all</span></div>
              <div className="mock-thumbs"><i/><i/><i/></div>
              <div className="mock-section-title">Keep exploring</div>
              <div className="mock-list"><i/><span/><i/><span/></div>
              <div className="mock-tab"><i/><i/><i/><i/></div>
            </div>
          </div>
          <div className="art-caption"><span className="caption-dot"/> A little more anime in your day.</div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="section-wrap trust-inner"><span>BUILT FOR THE WAY YOU WATCH</span><i/><span>DISCOVER</span><i/><span>PRESS PLAY</span><i/><span>REPEAT</span></div>
      </section>

      <section className="features section-wrap" id="features">
        <div className="section-heading">
          <div><div className="eyebrow">THE EXPERIENCE</div><h2>Less searching.<br/><em>More watching.</em></h2></div>
          <p>Everything starts with finding a great story. Anime - Vers brings discovery and viewing together in one simple mobile experience.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <div className="feature-top"><span>{feature.number}</span><span className="feature-icon">{feature.icon}</span></div>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
              <div className="feature-line" />
            </article>
          ))}
        </div>
      </section>

      <section className="download-band section-wrap" id="download">
        <div className="download-panel">
          <div className="download-copy">
            <div className="eyebrow"><span className="live-dot"/> READY WHEN YOU ARE</div>
            <h2>Make room for<br/><em>one more episode.</em></h2>
            <p>Take Anime - Vers with you. Download the Android app and find something worth watching.</p>
            <a className="button button-primary" href="/downloads/anime-vers.apk" download>
              <span className="download-icon">↓</span> Download the app
            </a>
            <span className="download-caption">Android app · APK download</span>
          </div>
          <div className="download-stamp"><span>ANIME</span><b>- VERS</b><i>YOUR NEXT STORY STARTS HERE</i><div>AV</div></div>
        </div>
      </section>

      <section className="how section-wrap" id="how-it-works">
        <div className="eyebrow">GET STARTED</div>
        <h2>Three steps. <em>That’s it.</em></h2>
        <div className="steps-grid">
          {steps.map(([number, title, copy]) => (
            <div className="step" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></div>
          ))}
        </div>
      </section>

      <section className="faq section-wrap" id="faq">
        <div><div className="eyebrow">GOOD TO KNOW</div><h2>A few quick<br/><em>answers.</em></h2></div>
        <div className="faq-list">
          <details><summary>Where can I download Anime - Vers?<span>+</span></summary><p>Use either download button on this page. The APK will be available once the app file is added to the website.</p></details>
          <details><summary>Is Anime - Vers available on iPhone?<span>+</span></summary><p>This page is currently set up for the Android app. iOS availability can be announced here if it becomes available.</p></details>
          <details><summary>How do I install the APK?<span>+</span></summary><p>After downloading, open the APK on your Android device and follow the installation prompts. Only install apps from sources you trust.</p></details>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand" href="#top"><span className="brand-mark">A<span>V</span></span><span>ANIME <b>- VERS</b></span></a>
        <span className="footer-copy">Made for anime fans. © {new Date().getFullYear()} Anime - Vers.</span>
        <a className="back-top" href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
