import fetch from 'node-fetch';

/**
 * Fetches PM2.5 forecast data for a specific station ID from CMUCCDC API
 * @param {number} stationId - The ID of the station to get forecast data for
 * @returns {Promise<Object>} The forecast data
 */
async function fetchPM25Forecast(stationId) {
    const url = `https://www-old.cmuccdc.org/api2/dustboy/forecast/${stationId}`;
    
    const headers = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'en-US,en;q=0.9',
        'dnt': '1',
        'origin': 'https://pm2_5.nrct.go.th',
        'priority': 'u=1, i',
        'referer': 'https://pm2_5.nrct.go.th/',
        'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "Brave";v="132"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'sec-gpc': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
    };

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching PM2.5 forecast:', error);
        throw error;
    }
}

export default fetchPM25Forecast;

// Example usage:
// fetchPM25Forecast(5363)
//     .then(data => console.log(data))
//     .catch(error => console.error('Error:', error));