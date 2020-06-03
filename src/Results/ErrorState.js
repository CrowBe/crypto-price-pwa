import React from 'react';

// Displayed if api request return error
const ErrorState = ({ error, retry }) => {
    console.log(error);
    return (
        <section>
            <span>Sorry, an error occured. </span>
            { retry ? <button onClick={retry}>Try again</button> : null }
        </section>
    )
}

export { ErrorState };