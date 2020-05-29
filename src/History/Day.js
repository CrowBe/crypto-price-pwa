import React, { useState, useEffect } from 'react';
import useStatus from '../hooks/useStatus';
import { LoadingState, ErrorState, EmptyState, Results } from '../Results';
import moment from 'moment';
import axios from 'axios';

// Reusable component that calls the cryptompare api for the date in props
// Retrieves data for the BTC, ETH & LTC to USD pairs
const Day = (props) => {
    const [ dayPrice, setDayPrice ] = useState({});
    const [error, setError] = useState(null)
    const { Status, setStatus } = useStatus('loading');
    const { date } = props;

    const apiKey = `&api_key={${process.env.REACT_APP_COIN_API_KEY}}`;
    // This function gets the ETH price for a specific timestamp/date. The date is passed in as an argument
    const getBTCPrices = (date) => {
        return axios.get('https://min-api.cryptocompare.com/data/pricehistorical?fsym=BTC&tsyms=USD&ts=' + date + apiKey);
    }
    // This function gets the BTC price for a specific timestamp/date. The date is passed in as an argument
    const getETHPrices = (date) => {
        return axios.get('https://min-api.cryptocompare.com/data/pricehistorical?fsym=ETH&tsyms=USD&ts=' + date + apiKey);
    }
    // This function gets the LTC price for a specific timestamp/date. The date is passed in as an argument
    const getLTCPrices = (date) => {
        return axios.get('https://min-api.cryptocompare.com/data/pricehistorical?fsym=LTC&tsyms=USD&ts=' + date + apiKey);
    }

    const getDayPrice = (t) => {
        // date is passed in as t and axios.all is used to make concurrent API requests.
        // we call and return axios.all so that we can handle the responses together
        return axios.all([getETHPrices(t), getBTCPrices(t), getLTCPrices(t)]);
    }

    // This function uses the api responses to set the price data and custom status
    // could be done more dynamically to account for variation in what is returned
    // and to allow for other cryptos to be queried.
    const handleSuccess = (eth, btc, ltc) => {
        setDayPrice({
            date: moment.unix(date).format("MMMM Do YYYY"),
            eth: eth.data.ETH.USD,
            btc: btc.data.BTC.USD,
            ltc: ltc.data.LTC.USD
        });
        // Check if the response was empty or if the dayPrice state object was populated
        Object.keys(dayPrice).length > 0 ? setStatus('empty') : setStatus('success');
    }

    // Spread any errors into the error state and set status.
    const handleError = (errors) => {
        let spreadErrors = Object.values(errors);
        setError(spreadErrors);
        setStatus('error');
    }
    
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

