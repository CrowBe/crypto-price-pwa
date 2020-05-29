import React from 'react';

const ErrorState = ({ error, retry }) => {
    return (
        <section>
        <h1>{ error }</h1>
        { retry ? <button onClick={retry}>Try again</button> : null }
        </section>
    )
}

export { ErrorState };