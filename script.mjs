import fetch from 'node-fetch';

fetch("https://www-old.cmuccdc.org/api2/dustboy/near/14.990677499999999/100.47800949999998", {
  method: "GET",
  headers: {
    "accept": "application/json, text/javascript, */*; q=0.01",
    "accept-language": "en-US,en;q=0.9",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Not A(Brand\";v=\"8\", \"Chromium\";v=\"132\", \"Brave\";v=\"132\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "sec-gpc": "1",
    "Referer": "https://pm2_5.nrct.go.th/",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  }
})
.then(response => response.json())
.then(data => console.log(data[0].pm25))
.catch(error => console.error('Error:', error));
