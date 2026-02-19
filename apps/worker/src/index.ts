console.log("SQL Explorer worker started");
setInterval(() => {
  console.log("worker heartbeat", new Date().toISOString());
}, 10000);
