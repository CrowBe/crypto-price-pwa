import React from 'react';
import './Results.css';

const Results = (props) => {
    // pull results off props
    const { results } = props;

    return (
        <div className="results">
            <p className="date">{results.date}</p>
            <div className="columns">
                {Object.keys(results).map(key => {
                    if (key === 'date') return null
                    let price = results[key].toString();
                    const dollarsAndCents = price.split(".");
                    if (dollarsAndCents[0].length > 3) {
                        price = `${dollarsAndCents[0].slice(0, -3)},${dollarsAndCents[0].slice(-3)}.${dollarsAndCents[1] || "00"}`;
                    }
                    price = `$${price} AUD`
                    return (
                        <div className="column" key={key}>
                            <h5>{price}</h5>
                            <p>{key}</p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export { Results };