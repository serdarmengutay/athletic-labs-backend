const express = require("express");
const app = express();
const port = 3001;

app.get("/", (req, res) => {
  res.send("Backend Sunucum Çalışıyor!");
});

app.listen(port, () => {
  console.log(`Sunucu http://localhost:${port} adresinde başlatıldı.`);
});
