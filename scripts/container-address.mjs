import { createServer } from 'node:net';

export function containerAddress(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid container test port.');
  const host = `127.0.0.1:${port}`, origin = `http://${host}`;
  return { host, origin, publish: `${host}:8765`, serverArguments: ['--allowed-host', host, '--allowed-origin', origin] };
}

export function availableContainerPort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close((error) => error ? reject(error) : resolve(port));
    });
  });
}
