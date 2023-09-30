import { useState, useEffect, useMemo } from "react";
import useStatus from "../hooks/useStatus";
import { LoadingState, ErrorState, EmptyState, Results } from "../Results";
import axios from "axios";
import { format, fromUnixTime, getUnixTime, sub } from "date-fns";
import { getPriceHistorical } from "../cryptoService";

// Reusable component that calls the cryptompare api for the date given in props
// Retrieves data for the BTC, ETH & XRP to AUD pairs
const Day = ({ day }: { day: number }) => {
  const [dayPrice, setDayPrice] = useState<ITodayCurrencyPriceData>();
  const [error, setError] = useState<string | null>(null);
  const { Status, setStatus } = useStatus("loading");
  let date = useMemo(() => getUnixTime(sub(new Date(), { days: day })), [day]);

  // This function gets the ETH price for a specific timestamp/date. The date is passed in as an argument
  const getBTCPrices = (date: number) => {
    return getPriceHistorical("BTC", ["AUD"], date);
  };

  // This function gets the BTC price for a specific timestamp/date. The date is passed in as an argument
  const getETHPrices = (date: number) => {
    return getPriceHistorical("ETH", ["AUD"], date);
  };

  // This function gets the XRP price for a specific timestamp/date. The date is passed in as an argument
  const getXRPPrices = (date: number) => {
    return getPriceHistorical("XRP", ["AUD"], date);
  };

  const getDayPrice = (t: number) => {
    // date is passed in as t and axios.all is used to make concurrent API requests.
    // we call and return axios.all so that we can handle the responses together
    return axios.all([getETHPrices(t), getBTCPrices(t), getXRPPrices(t)]);
  };

  const saveStateToLocalStorage = (prices: {
    ETH: string;
    BTC: string;
    XRP: string;
    date: string;
  }) => {
    localStorage.setItem(`day-state-${day}`, JSON.stringify(prices));
  };

  // This function uses the api responses to set the price data and custom status
  // could be done more dynamically to account for variation in what is returned
  // and to allow for other cryptos to be queried.
  const handleSuccess = (
    eth: { ETH?: { AUD: string } },
    btc: { BTC: { AUD: string } },
    xrp: { XRP: { AUD: string } }
  ) => {
    const prices = {
      date: format(fromUnixTime(date), "MMM do yy"),
      ETH: eth.ETH?.AUD || "",
      BTC: btc.BTC?.AUD || "",
      XRP: xrp.XRP?.AUD || "",
    };
    saveStateToLocalStorage(prices);
    setDayPrice(prices);
    // Check if the response was empty or if the dayPrice state object was populated
    setStatus("success");
  };

  // Spread any errors into the error state and set status.
  const handleError = (errors: string) => {
    setError(errors);
    setStatus("error");
  };

  // accesses saved local state values and passes them to app state
  const restoreStateFromLocalStorage = () => {
    let dayState: string | null = localStorage.getItem(`day-state-${day}`);
    if (dayState) setDayPrice(JSON.parse(dayState));
  };

  // This function initialises the component with a loading state
  // The asynchronous api call is then made and the response passed
  // as arguments to the handleSuccess or handleError callbacks
  function fetchResults() {
    setStatus("loading");
    // axios.spread is used to ensure all of the requests complete before passing
    // the responses to handleSuccess. Should minimize DOM updates.
    // @ts-ignore requires more significant rewrite
    getDayPrice(date).then(axios.spread(handleSuccess)).catch(handleError);
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
      error={<ErrorState error={error} retry={fetchResults} />}
      success={dayPrice ? <Results results={dayPrice} /> : <></>}
    />
  );
};

export default Day;
