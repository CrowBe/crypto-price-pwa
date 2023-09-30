import React, { useState } from "react";
import "./History.css";
import Day from "./Day";

const History = () => {
  const [numDays, setNumDays] = useState<number>(1);
  let days = Array.from({ length: numDays }, (_, i) => i + 1);
  const adjustNumDays = (direction: "decrement" | "increment") => {
    if (direction === "decrement" && numDays > 1) {
      setNumDays(numDays - 1);
    } else if (direction === "increment" && numDays < 10) {
      setNumDays(numDays + 1);
    } else {
      alert("Cannot set the number of days to be less than 1 or more than 10");
    }
  };
  return (
    <div className="history-section-container">
      <h2>Historical Data</h2>
      {/* Add variable for n of days */}
      <p className="section-description">
        Daily average price for the past{" "}
        <button onClick={() => adjustNumDays("decrement")}>-</button>
        <em> {numDays} </em>
        <button onClick={() => adjustNumDays("increment")}>+</button> days
      </p>
      <div className="days-container">
        {days.map((day) => {
          return <Day day={day} key={day} />;
        })}
      </div>
    </div>
  );
};

export default History;
