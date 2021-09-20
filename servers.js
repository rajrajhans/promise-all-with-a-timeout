const express = require("express");
const app = express();
const ports = [3001, 3002, 3003];

app.get("/", (req, res) => {
  const r = Math.floor(Math.random() * 100);
  res.send(String(r));
});

ports.forEach((port) => {
  app.listen(port, () => {
    console.log(`Sample Server listening at http://localhost:${port}`);
  });
});
