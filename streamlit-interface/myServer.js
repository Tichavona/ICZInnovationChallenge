const express = require('express');
const app = express();
const sql = require('mssql');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// SQL Server configuration
const config = {
  user: 'deAdmin',
  password: 'D3c!s!0n3dg3',
  server: 'localhost', // Use the correct IP or hostname without the port
  port: 49423, // The port goes in a separate field, not appended to the server
  database: 'zimpapersGPT',
  options: {
      encrypt: true, // For Azure, set this to true, otherwise false if local
      trustServerCertificate: true // If you're working locally and self-signed certificate is used
  }
};

// SQL query function to insert device info
async function insertDeviceInfo(deviceInfo) {
  try {
      // Connect to the database
      const pool = await sql.connect(config);

      // Insert query
      const query = `
      INSERT INTO DeviceInfo (userAgent, platform, language, screenWidth, screenHeight, connectionType, providerIP, machineIP, latitude, longitude, deviceType, deviceBrand, deviceModel, UserID)
      VALUES ('${deviceInfo.userAgent}', '${deviceInfo.platform}', '${deviceInfo.language}', '${deviceInfo.screenWidth}', '${deviceInfo.screenHeight}', '${deviceInfo.connectionType}', '${deviceInfo.providerIP || 'Unknown'}', '${deviceInfo.machineIP || 'Unknown'}', '${deviceInfo.geoLocation.latitude}', '${deviceInfo.geoLocation.longitude}', '${deviceInfo.deviceType}', '${deviceInfo.deviceBrand}', '${deviceInfo.deviceModel}', '${deviceInfo.UserID}')
    `;

      // Execute the query
      await pool.request().query(query);
      console.log('Device info saved to database.');
  } catch (err) {
      console.error('Error saving device info to database:', err);
  }
}

// Endpoint to receive and save device info
app.post('/device-info', (req, res) => { // Changed endpoint to match the Streamlit fetch request
  const deviceInfo = req.body; // Get the device data from the request body
  console.log('Received device info:', deviceInfo); // Log to console

  // Insert device info into the database
  insertDeviceInfo(deviceInfo)
      .then(() => res.status(200).send('Device info received and saved to the database.'))
      .catch((err) => {
          console.error(err);
          res.status(500).send('Failed to save device info.');
      });
});

/* Route to handle incoming device information
app.post('/device-info', (req, res) => {
  const deviceInfo = req.body;

  // Log the device information for demonstration purposes
  console.log('Received device info:', deviceInfo);

  // Respond to the client
  res.status(200).send('Device information received successfully.');
});
*/

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});