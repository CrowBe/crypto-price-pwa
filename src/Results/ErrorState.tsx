import React from "react";
import "./Error.css";

// Displayed if api request return error
const ErrorState = ({
  error,
  retry,
}: {
  error: string | null;
  retry: () => void;
}) => {
  console.error(error);
  return (
    <section>
      <span className="error-message">Sorry, an error occured </span>
      {retry ? (
        <button className="error-button" onClick={retry}>
          Reload
        </button>
      ) : null}
    </section>
  );
};

export { ErrorState };
