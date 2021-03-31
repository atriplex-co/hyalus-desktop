module.exports = (ws) => {
  ws.send({
    t: "keepaliveAck",
  });

  ws.lastKeepalive = Date.now();
};
