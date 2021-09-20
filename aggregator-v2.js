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
  let results = [];
  const networkPromises = [];
  let wrappedPromises = [];

  for (const serverURL of servers) {
    networkPromises.push(request(serverURL));
  }

  wrappedPromises = networkPromises.map((promise) => {
    const waitForSeconds = new Promise((resolve) => {
      setTimeout(() => {
        resolve("Server didn't respond");
      }, 4000);
    });

    const wrapperPromise = Promise.race([promise, waitForSeconds]).catch(
      (err) => {
        console.log("erroring");
        return "server is down";
      }
    );

    return wrapperPromise;
  });

  await Promise.all(wrappedPromises)
    .then((data) => {
      results = data;
      console.log(data);
    })
    .catch((err) => {
      console.log("promise all err");
    });

  res.json(results);
});

app.listen(port, () => {
  console.log(`Aggregator app listening at http://localhost:${port}`);
});
