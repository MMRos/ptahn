const os = require('os');

/**
 * Returns the primary local IPv4 address of this machine (e.g. 192.168.1.X)
 * @returns {string}
 */
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

module.exports = {
  getLocalIpAddress
};
