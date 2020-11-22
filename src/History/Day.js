import React, { useState, useEffect } from 'react';
import useStatus from '../hooks/useStatus';
import { LoadingState, ErrorState, EmptyState, Results } from '../Results';
import moment from 'moment';
import axios from 'axios';

// Reusable component that calls the cryptompare api for the date given in props
// Retrieves data for the BTC, ETH & XRP to AUD pairs
const Day = (props) => {
    const [ dayPrice, setDayPrice ] = useState({});
    const [error, setError] = useState(null)
    const { Status, setStatus } = useStatus('loading');
    const { day } = props;
    const apiKey = process.env.REACT_APP_COIN_API_KEY;
    let date = moment().subtract(day, 'days').unix();

    // This function gets the ETH price for a specific timestamp/date. The date is passed in as an argument
    const getBTCPrices = (date) => {
        return axios.get('https://min-api.cryptocompare.com/data/pricehistorical?fsym=BTC&tsyms=AUD&ts=' + date, {
                authorization: `ApiKey ${apiKey}`
            });
    }

    // This function gets the BTC price for a specific timestamp/date. The date is passed in as an argument
    const getETHPrices = (date) => {
        return axios.get('https://min-api.cryptocompare.com/data/pricehistorical?fsym=ETH&tsyms=AUD&ts=' + date, {
            authorization: `ApiKey ${apiKey}`
        });
    }

    // This function gets the XRP price for a specific timestamp/date. The date is passed in as an argument
    const getXRPPrices = (date) => {
        return axios.get('https://min-api.cryptocompare.com/data/pricehistorical?fsym=XRP&tsyms=AUD&ts=' + date, {
            authorization: `ApiKey ${apiKey}`
        });
    }

    const getDayPrice = (t) => {
        // date is passed in as t and axios.all is used to make concurrent API requests.
        // we call and return axios.all so that we can handle the responses together
        return axios.all([getETHPrices(t), getBTCPrices(t), getXRPPrices(t)]);
    }
    
    const saveStateToLocalStorage = (prices) => {
		localStorage.setItem(`day-state-${day}`, JSON.stringify(prices));
    };
    
    // This function uses the api responses to set the price data and custom status
    // could be done more dynamically to account for variation in what is returned
    // and to allow for other cryptos to be queried.
    const handleSuccess = (eth, btc, xrp) => {
        const prices = {
            date: moment.unix(date).format("MMMM Do YYYY"),
            ETH: eth.data.ETH.AUD,
            BTC: btc.data.BTC.AUD,
            XRP: xrp.data.XRP.AUD
        }
        saveStateToLocalStorage(prices);
        setDayPrice(prices);
        // Check if the response was empty or if the dayPrice state object was populated
        Object.keys(dayPrice).length > 0 ? setStatus('empty') : setStatus('success');
    }

    // Spread any errors into the error state and set status.
    const handleError = (errors) => {
        setError(errors);
        setStatus('error');
    }

    // accesses saved local state values and passes them to app state
	const restoreStateFromLocalStorage = () => {
		const state = JSON.parse(localStorage.getItem(`day-state-${day}`));
		setDayPrice(state);
    };
    
    // This function initialises the component with a loading state
    // The asynchronous api call is then made and the response passed
    // as arguments to the handleSuccess or handleError callbacks
    function fetchResults() {
        setStatus('loading');
        return (
            getDayPrice(date)
                // axios.spread is used to ensure all of the requests complete before passing
                // the responses to handleSuccess. Should minimize DOM updates.
                .then(axios.spread(handleSuccess))
                .catch(handleError)
        );
    }
    
    // useEffect ensures fetchResults is called on component mount.
    // We give it an empty array of dependencies to avoide looping requests.
    useEffect(() => {
        let online = window.navigator.onLine;
        if (!online) {
			return restoreStateFromLocalStorage();
        }
        fetchResults();
    }, []);

    return (
        // This custom status component updates the dom appropriately based on current status
        <Status
            loading={<LoadingState />}
            empty={<EmptyState />}
            error={<ErrorState error={error} retry={fetchResults}/>}
            success={<Results results={dayPrice} />}
        />
    )
}

export default Day;

