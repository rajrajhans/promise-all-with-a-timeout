const express = require("express");
const app = express();
const request = require("request-promise"); 
const port = 3000;

// 3001, 3002, 3003 work. but 3420 is invalid.
const servers = [
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3420",
  "http://localhost:3003",
];

app.get("/", async (req, res) => {
  const results = [];

  for (const serverURL of servers) {
    await request
      .get(serverURL)
      .then((d) => {
        console.log(d);
        results.push(d)
      })
      .catch((e) => {
        results.push(`Server ${serverURL} is down!`);
      });
  }

  res.json(results);
});

app.listen(port, () => {
  console.log(`Aggregator app listening at http://localhost:${port}`);
});