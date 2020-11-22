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
                    return (
                        <div className="column" key={key}>
                            <h5>${results[key]} AUD</h5>
                            <p>1 {key}</p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export { Results };