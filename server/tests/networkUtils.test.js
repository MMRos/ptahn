const { getLocalIpAddress } = require('../utils/networkUtils');

describe('NetworkUtils Module', () => {
  test('getLocalIpAddress returns a valid IPv4 string or localhost fallback', () => {
    const ip = getLocalIpAddress();
    expect(typeof ip).toBe('string');
    expect(ip.length).toBeGreaterThan(0);
    // Should be either a valid IPv4 (e.g. 192.168.x.x or 10.x.x.x or 127.0.0.1)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    expect(ipv4Regex.test(ip)).toBe(true);
  });
});
