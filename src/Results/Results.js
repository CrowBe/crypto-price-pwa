import React from 'react';

const Results = ({ results }) => {
    return (
        <div className="history--section__box__inner">
        <h4>{results.date}</h4>
        <div className="columns">
            <div className="column">
                <p>1 BTC = ${results.btc}</p>
            </div>
            <div className="column">
                <p>1 ETH = ${results.eth}</p>
            </div>
            <div className="column">
                <p>1 LTC = ${results.ltc}</p>
            </div>
        </div>
    </div>
    )
}

export { Results };