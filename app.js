const mongoose = require('mongoose');
const axios = require('axios');
const schedule = require('node-schedule');

// MongoDB Atlas Connection
const mongoURI = 'mongodb+srv://admin:admin@cluster0.bivti.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Connect to MongoDB Atlas
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas successfully'))
  .catch((error) => {
    console.error('Error connecting to MongoDB Atlas:', error.message);
    process.exit(1); // Exit the process if the connection fails
  });

// Define a Schema and Model to Store Data
const BSEDataSchema = new mongoose.Schema({
  fetchedAt: { type: Date, default: Date.now },
  data: Object, // You can adjust the schema based on the structure of API data
});

const BSEData = mongoose.model('BSEData', BSEDataSchema);

// Function to get current date in YYYYMMDD format
const getCurrentDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

// Function to construct the URL with dynamic query parameters
const constructURL = () => {
  const baseURL = 'https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w';
  const queryParams = {
    pageno: 1,
    strCat: 'Company+Update',
    strPrevDate: getCurrentDate(),
    strScrip: '',
    strSearch: 'P',
    strToDate: getCurrentDate(),
    strType: 'C',
    subcategory: 'Award+of+Order+%2F+Receipt+of+Order',
  };

  // Build query string
  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return `${baseURL}?${queryString}`;
};

// Function to Fetch Data and Store in MongoDB
const fetchBSEData = async () => {
  const url = constructURL();

  const config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: url,
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      origin: 'https://www.bseindia.com',
      priority: 'u=1, i',
      referer: 'https://www.bseindia.com/',
      'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    },
  };

  try {
    const response = await axios(config);
    console.log('Data fetched successfully:', response.data);

    // Save data to MongoDB
    const record = new BSEData({ data: response.data });
    await record.save();
    console.log('Data saved to MongoDB Atlas:', record);
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
};

// Schedule the API Call
schedule.scheduleJob('*/1 * * * *', () => {
  console.log('Scheduler triggered at:', new Date().toLocaleString());
  fetchBSEData();
});


// Start the server (Optional)
const express = require("express");
const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
  res.send("BSE API Scheduler is running.");
});

// **API Endpoint to Fetch Data from MongoDB**
app.get('/orderList', async (req, res) => {
  try {
    // Query the database for stored BSE data
    const data = await BSEData.find().sort({ fetchedAt: -1 }).limit(10); // Get the latest 10 records
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching data from MongoDB:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from the database' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
