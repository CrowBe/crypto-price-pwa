import React, { useState, useEffect} from 'react';
import './Today.css';
import axios from 'axios';
import Pusher from 'pusher-js';
import useStatus from '../hooks/useStatus';
import moment from 'moment';
import { LoadingState, ErrorState, EmptyState, Results } from '../Results';
const cluster = process.env.REACT_APP_PUSHER_CLUSTER;
const appKey = process.env.REACT_APP_PUSHER_KEY;
const apiKey = process.env.REACT_APP_COIN_API_KEY;

const Today = () => {
    // initialise default state values and setters for prices
    const [ todayPrice, setTodayPrice ] = useState({});
    const [error, setError] = useState(null)
    const { Status, setStatus } = useStatus('loading');

    // This function posts the price data to our server that updates our pusher
    // channel that we then create a subscription to.
    const sendPricePusher = (response) => {
        axios.post('https://crypto-track-server.herokuapp.com/prices/new', {
            prices: response.data
        })
            .catch(error => {
                console.log(error)
            })
    }
      
    function showNotification(title, message) {
        if ('Notification' in window) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    body: message,
                    tag: 'notification-sample'
                });
            });
        }
    }
    
    const saveStateToLocalStorage = (today) => {
		localStorage.setItem('today-state', JSON.stringify(today));
	};

    // access saved local state values and passes them to app state
	const restoreStateFromLocalStorage = () => {
		const state = JSON.parse(localStorage.getItem('today-state'));
		setTodayPrice(state);
    };

    // reuseable call to our api
    const getTodayPrice = () => {
        return axios.get("https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,XRP&tsyms=AUD", {
            authorization: `ApiKey ${apiKey}`
        });
    }

    // reusable api call success callback
    const handleSuccess = (response) => {
        const { data } = response;
        const today = {
            date: `Price is current as of: ${moment().format('h:mm A')}`,
            ETH: data.ETH.AUD,
            BTC: data.BTC.AUD,
            XRP: data.XRP.AUD
        }
        saveStateToLocalStorage(today);
        setTodayPrice(today);
        // Check if the response was empty or if the dayPrice state object was populated
        Object.keys(todayPrice).length > 0 ? setStatus('empty') : setStatus('success');
    }

    // reusable promise error callback
    const handleError = (error) => {
        setError(error);
        setStatus('error');
    }

    // function that calls the api and handles the response with default callback
    // Can be passed custom response callback for passing the data to our Pusher channel
    function fetchResults(callback = handleSuccess, statusChange=true) {
        if (statusChange) {
            setStatus('loading')
        }
        return (
            getTodayPrice()
                .then(callback)
                .catch(handleError)
        );
    }

    // This is called on render and rerender. Use Status hook needs to be implemented.
    useEffect(() => {
        let online = window.navigator.onLine;
        if (!online) {
			return restoreStateFromLocalStorage();
        }
        
        // establish a connection to Pusher
        const pusher = new Pusher(appKey, {
            cluster: cluster,
            encrypted: true
        });

        // Subscribe to the 'coin-prices' channel
        const prices = pusher.subscribe('coin-prices');

        // Make the initial call to our api
        fetchResults();
        const cryptoSubscription = setInterval(() => {
            fetchResults(sendPricePusher, false);
        }, 60000);

        prices.bind('prices', price => {
            // When the pusher channel broadcasts an update we bind that data to our price state.
            let today = {
                date: `Price is current as of: ${moment().format('h:mm A')}`,
                ETH: price.prices.ETH.AUD,
                BTC: price.prices.BTC.AUD,
                XRP: price.prices.XRP.AUD
            }
            Notification.requestPermission(result => {
                if (result === 'granted') {
                    showNotification('Price Update!', 'Check the new live prices.')
                }
            });
            saveStateToLocalStorage(today);
            setTodayPrice(today);
            Object.keys(todayPrice).length > 0 ? setStatus('empty') : setStatus('success');
            // We then save that update price to local storage for offline use
        });

        return () => {
            clearInterval(cryptoSubscription);
            pusher.unsubscribe('coin-prices');
        };
    }, []);

    // Return the structured JSX with dynamic data
    return (
        <div className="today-section-container">
            <h2>Live Prices</h2>
            <Status
                loading={<LoadingState />}
                empty={<EmptyState />}
                error={<ErrorState error={error} retry={fetchResults}/>}
                success={<Results results={todayPrice} />}
            />
        </div>
    )
}

export default Today;