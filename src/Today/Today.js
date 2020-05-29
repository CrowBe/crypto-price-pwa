import React, { useState, useEffect} from 'react';
import './Today.css';
import axios from 'axios';


const Today = () => {
    // initialise default state values and setters for prices
    const [ btcPrice, setBtcPrice ] = useState('');
    const [ ethPrice, setEthPrice ] = useState('');
    const [ ltcPrice, setLtcPrice ] = useState('');
    const apiKey = `&api_key={${process.env.REACT_APP_COIN_API_KEY}}`;
    // This is called on render and rerender. Logic will need to be improved to avoid multiple renders
    // Check out https://levelup.gitconnected.com/usestatus-a-custom-react-hook-for-managing-ui-states-a5b1bc6555bf
    // for possible custom hook to manage this async dependency
    useEffect(() => {
        axios.get('https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,LTC&tsyms=USD' + apiKey)
            .then(response => {
                // We set the latest prices in the state to the prices gotten from Cryptocurrency.
                setBtcPrice(response.data.BTC.USD);
                setEthPrice(response.data.ETH.USD);
                setLtcPrice(response.data.LTC.USD);
            })
            // Catch any error here
            .catch(error => {
                // TBC: set up improved error handling
                console.log(error)
            })
    });
    // Return the structured JSX with dynamic data
    return (
        <div className="today--section container">
            <h2>Current Price</h2>
            <div className="columns today--section__box">
                <div className="column btc--section">
                    <h5>${btcPrice}</h5>
                    <p>1 BTC</p>
                </div>
                <div className="column eth--section">
                    <h5>${ethPrice}</h5>
                    <p>1 ETH</p>
                </div>
                <div className="column ltc--section">
                    <h5>${ltcPrice}</h5>
                    <p>1 LTC</p>
                </div>
            </div>
        </div>
    )
}

export default Today;