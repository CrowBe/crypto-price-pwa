import React from 'react';
import './History.css'
import moment from 'moment';
import Day from './Day';

const History = () => {
    // Today
    let t0 = moment().unix()
    // Yesterday
    let t1 = moment().subtract(1, 'days').unix();
    // Two Days ago
    let t2 = moment().subtract(2, 'days').unix();
    // Three Days ago
    let t3 = moment().subtract(3, 'days').unix();
    // Four Days ago
    let t4 = moment().subtract(4, 'days').unix();

    const days = [ t0, t1, t2, t3, t4 ]

    return (
        <div className="history--section container">
            <h2>History (Past 5 days)</h2>
            <div className="history--section__box">
                <div className="history--section__box__inner">
                    {days.map(day => {
                        return(
                            <Day date={day} key={day}/>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default History;