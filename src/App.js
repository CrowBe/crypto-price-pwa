import React, { useState } from 'react';
// Import CSS from App.css
import './App.css';
// Import the Today component to be used below
import Today from './Today/Today'
// Import the History component to be used below
import History from './History/History'

const App = () => {
	return (
	  <div className="App">
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
				<a className="footer-item" href="https://pusher.com" target="_blank" rel="noopener noreferrer">Push Service</a>
				<a className="footer-item" href="https://min-api.cryptocompare.com" target="_blank" rel="noopener noreferrer">Price Api</a>
				<a className="footer-item" href="https://vercel.com" target="_blank" rel="noopener noreferrer">Deployment</a>
			</footer>
	  </div>
	);
}

export default App;
