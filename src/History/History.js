import React from 'react';
import './History.css'
import Day from './Day';

const History = () => {
    let days = [ 1, 2, 3, 4, 5]
    return (
        <div className="history-section">
            <h2>Historical Data</h2>
            <p>Price averages for the past 5 days:</p>
            <div className="days-container">
                {days.map(day => {
                    return(
                        <Day day={day} key={day}/>
                    )
                })}
            </div>
        </div>
    )
}

export default History;