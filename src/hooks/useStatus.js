import { useState } from 'react';

// Custom hook by Michael Theodorou https://levelup.gitconnected.com/usestatus-a-custom-react-hook-for-managing-ui-states-a5b1bc6555bf
const useStatus = (initialState) => {
    const [status, setStatus] = useState(initialState);
    // React Component that returns prop Component or null based on current status
    const Status = (props) => {
        return props[status] || null;
    }
    // return custom state and setter
    return { Status, setStatus };
}

export default useStatus;