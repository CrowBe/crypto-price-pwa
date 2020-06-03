import React from 'react';
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
					<div className="nav-item-container">
						<span className="navbar-item">PusherCoins</span>
					</div>
					<div className="nav-item-container">
						<a className="navbar-item" href="https://pusher.com" target="_blank" rel="noopener noreferrer">Pusher.com</a>
					</div>
				</nav>
			</header>
			<section className="app-content">
				<h1>Real Time Crypto Price Information</h1>
				<div className="results-section">
					<Today />
					<History />
				</div>
			</section>
	  </div>
	);
}

export default App;
