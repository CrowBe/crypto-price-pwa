import { useState, useEffect } from "react";
import "./Today.css";
import axios from "axios";
import Pusher from "pusher-js";
import useStatus from "../hooks/useStatus";
import { LoadingState, ErrorState, EmptyState, Results } from "../Results";
import { format } from "date-fns";
import { getPriceMulti } from "../cryptoService";
import { AUDollarFormatter } from "../utils";
import { enAU } from "date-fns/locale";
const cluster = process.env.REACT_APP_PUSHER_CLUSTER;
const appKey = process.env.REACT_APP_PUSHER_KEY;
const pusherApi = process.env.REACT_APP_PUSHER_API;

const Today = () => {
  // initialise default state values and setters for prices
  const [todayPrice, setTodayPrice] = useState<ITodayCurrencyPriceData>();
  const [error, setError] = useState<string | null>(null);
  const { Status, setStatus } = useStatus("loading");

  // This function posts the price data to our server that updates our pusher
  // channel that we then create a subscription to.
  const sendPricePusher = (response: ITodayCurrencyPriceData) => {
    axios
      .post(`${pusherApi}/prices/new`, {
        ...todayPrice,
        ETH: response.ETH,
        BTC: response.BTC,
        XRP: response.XRP,
      })
      .catch(handleError);
  };

  // TODO: Reimplement proper notifications
  // function showNotification(title: string, message: string) {
  //   if ("Notification" in window) {
  //     navigator.serviceWorker.ready.then((registration) => {
  //       registration.showNotification(title, {
  //         body: message,
  //         tag: "notification-sample",
  //       });
  //     });
  //   }
  // }

  const saveStateToLocalStorage = (today: ITodayCurrencyPriceData) => {
    localStorage.setItem("today-state", JSON.stringify(today));
  };

  // access saved local state values and passes them to app state
  const restoreStateFromLocalStorage = () => {
    let todayState = localStorage.getItem("today-state");
    if (todayState) setTodayPrice(JSON.parse(todayState));
  };

  const getCurrentTimeString = (): string =>
    format(new Date(), "KK:mm a", { locale: enAU });

  // reusable api call success callback
  const handleSuccess = (response: ITodayCurrencyPriceData) => {
    let eth = response?.ETH || todayPrice?.ETH;
    let btc = response?.BTC || todayPrice?.BTC;
    let xrp = response?.XRP || todayPrice?.XRP;
    const today: ITodayCurrencyPriceData = {
      date: `Price is current as of: ${getCurrentTimeString()}`,
      ETH: eth ? eth : "error",
      BTC: btc ? btc : "error",
      XRP: xrp ? xrp : "error",
    };
    saveStateToLocalStorage(today);
    setTodayPrice(today);
    setStatus("success");
  };

  // reusable promise error callback
  const handleError = (error: string) => {
    setError(error);
    setStatus("error");
  };

  // function that calls the api and handles the response with default callback
  // Can be passed custom response callback for passing the data to our Pusher channel
  function fetchResults(callback = handleSuccess, statusChange = true) {
    if (statusChange) {
      setStatus("loading");
    }
    getPriceMulti(["BTC", "ETH", "XRP"], ["AUD"])
      .then((res) => {
        let eth = res?.ETH?.AUD || todayPrice?.ETH;
        let btc = res?.BTC?.AUD || todayPrice?.BTC;
        let xrp = res?.XRP?.AUD || todayPrice?.XRP;
        let data: ITodayCurrencyPriceData = {
          date: `Price is current as of: ${getCurrentTimeString()}`,
          ETH: eth ? AUDollarFormatter.format(parseFloat(eth)) : "error",
          BTC: btc ? AUDollarFormatter.format(parseFloat(btc)) : "error",
          XRP: xrp ? AUDollarFormatter.format(parseFloat(xrp)) : "error",
        };
        callback(data);
      })
      .catch(handleError);
    return setTimeout(() => {
      fetchResults(sendPricePusher);
    }, 60000);
  }

  // This is called on render and rerender. Use Status hook needs to be implemented.
  useEffect(() => {
    let online = window.navigator.onLine;
    if (!online) {
      return restoreStateFromLocalStorage();
    }
    if (appKey && cluster) {
      // establish a connection to Pusher
      const pusher = new Pusher(appKey, {
        cluster: cluster,
      });

      // Subscribe to the 'coin-prices' channel
      const prices = pusher.subscribe("coin-prices");

      // Make the initial call to our api
      const cryptoSubscription = fetchResults();

      prices.bind("prices", (data: ITodayCurrencyPriceData) => {
        // When the pusher channel broadcasts an update we bind that data to our price state.
        handleSuccess(data);
        // Notification.requestPermission((result) => {
        //   if (result === "granted") {
        //     showNotification("Price Update!", "Check the new live prices.");
        //   }
        // });
      });
      return () => {
        clearTimeout(cryptoSubscription);
        pusher.unsubscribe("coin-prices");
      };
    }
  }, []);

  // Return the structured JSX with dynamic data
  return (
    <div className="today-section-container">
      <h2>Live Prices</h2>
      <Status
        loading={<LoadingState />}
        empty={<EmptyState />}
        error={<ErrorState error={error} retry={fetchResults} />}
        success={todayPrice ? <Results results={todayPrice} /> : <></>}
      />
    </div>
  );
};

export default Today;
