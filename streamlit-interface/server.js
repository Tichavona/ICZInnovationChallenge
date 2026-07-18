const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();
const sql = require('mssql');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const axios = require('axios');

// Disable SSL verification for self-signed certificate
const agent = new https.Agent({
  rejectUnauthorized: false,
});

axios.get('https://localhost:3000', { httpsAgent: agent })
  .then(response => console.log(response.data))
  .catch(error => console.error(error));

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// SQL Server configuration
const config = {
  user: 'deAdmin',
  password: 'D3c!s!0n3dg3',
  server: 'localhost',
  port: 49423,
  database: 'dbGPT',
  options: {
    encrypt: true, // For Azure
    trustServerCertificate: true, // Self-signed certificate support
  }
};

// SQL query function to insert device info (simplified for this context)
async function insertDeviceInfo(deviceInfo) {
  try {
    const pool = await sql.connect(config);
    const query = `
      INSERT INTO DeviceInfo (userAgent, platform, language, screenWidth, screenHeight, connectionType, providerIP, machineIP, latitude, longitude, deviceType, deviceBrand, deviceModel, UserID)
      VALUES ('${deviceInfo.userAgent}', '${deviceInfo.platform}', '${deviceInfo.language}', '${deviceInfo.screenWidth}', '${deviceInfo.screenHeight}', '${deviceInfo.connectionType}', '${deviceInfo.providerIP || 'Unknown'}', '${deviceInfo.machineIP || 'Unknown'}', '${deviceInfo.geoLocation.latitude}', '${deviceInfo.geoLocation.longitude}', '${deviceInfo.deviceType}', '${deviceInfo.deviceBrand}', '${deviceInfo.deviceModel}', '${deviceInfo.UserID}')
    `;
    await pool.request().query(query);
    console.log('Device info saved to database.');
  } catch (err) {
    console.error('Error saving device info to database:', err);
  }
}

// Endpoint to receive and save device info
app.post('/device-info', (req, res) => {
  const deviceInfo = req.body;
  console.log('Received device info:', deviceInfo);

  insertDeviceInfo(deviceInfo)
    .then(() => res.status(200).send('Device info received and saved to the database.'))
    .catch((err) => {
      console.error(err);
      res.status(500).send('Failed to save device info.');
    });
});

// Load SSL certificates for HTTPS
const options = {
  key: fs.readFileSync('C:/Users/ACER/privatekey.pem'),
  cert: fs.readFileSync('C:/Users/ACER/certificate.pem'),
};

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve 'device_info.js' properly
app.get('/device_info.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'device_info.js'));
});

// Default route for testing
app.get('/', (req, res) => {
  res.send('Welcome to the secure server!');
});

// Create an HTTPS server
https.createServer(options, app).listen(3000, () => {
  console.log('Secure HTTPS server running on port 3000');
});
