import "./App.css";
import Today from "./Today/Today";
import History from "./History/History";

function App() {
  return (
    <div id="app-container">
      <header>
        <nav className="navbar">
          <h2 className="navbar-header">Easy Crypto Tracking</h2>
        </nav>
      </header>
      <section className="app-content">
        <h1>Real Time Crypto Price Information</h1>
        <div className="results-section">
          <Today />
          <History />
        </div>
      </section>
      <footer>
        <a
          className="footer-item"
          href="https://pusher.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Push Service
        </a>
        <a
          className="footer-item"
          href="https://min-api.cryptocompare.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Price Api
        </a>
        <a
          className="footer-item"
          href="https://vercel.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Deployment
        </a>
      </footer>
    </div>
  );
}

export default App;
