module.exports = (data, ws, deps) => {
  ws.send({
    t: "keepaliveAck",
  });

  ws.lastKeepalive = Date.now();
};
