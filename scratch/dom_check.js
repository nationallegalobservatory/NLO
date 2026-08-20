const http = require('http');

http.get('http://localhost:3000', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Basic checking for sections and placeholders
    const numLinks = (data.match(/<a href="\/publications/g) || []).length;
    console.log(`Number of publication links: ${numLinks}`);
    
    // Check if Tukaram is in the DOM
    const hasTukaram = data.includes('tukaram-v-maharashtra');
    console.log(`Has Tukaram link: ${hasTukaram}`);

    // Check if the Countdown is active
    const hasCountdown = data.includes('Upcoming Release');
    console.log(`Has Countdown: ${hasCountdown}`);
    
    // Check if there are any skeleton or loading or queue texts
    const hasQueue = data.includes('queue') || data.includes('Queue');
    console.log(`Has Queue: ${hasQueue}`);
  });
}).on('error', err => {
  console.log("Error: " + err.message);
});
