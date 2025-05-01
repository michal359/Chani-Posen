import { useEffect, useState } from 'react';
import { serverRequests } from '../Api';

export const usePollingData = ({ url, extractData, intervalMs = 2000, enabled = true }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!enabled || !url) return;

    const fetchData = () => {
      serverRequests('GET', url, null)
        .then(res => {
          if (!res.ok) {
            console.error(`Failed to fetch from ${url}`);
            return;
          }
          return res.json();
        })
        .then(json => {
          if (json?.success && extractData) {
            setData(extractData(json));
          }
        })
        .catch(err => {
          console.error(`Error fetching from ${url}:`, err);
        });
    };

    fetchData(); 
    const interval = setInterval(fetchData, intervalMs);

    return () => clearInterval(interval); 
  }, [url, intervalMs, enabled]);

  return data;
};
