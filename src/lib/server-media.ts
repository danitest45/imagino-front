import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export function allowedMediaUrl(raw: string, configuredHosts = process.env.MEDIA_ALLOWED_HOSTS ?? ''): URL {
  const url = new URL(raw);
  const hosts = configuredHosts.split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
  const host = url.hostname.toLowerCase();
  const allowed = hosts.includes(host) || host === 'replicate.delivery' || host.endsWith('.replicate.delivery');
  if (url.protocol !== 'https:' || (url.port && url.port !== '443') || url.username || url.password || url.hash || isIP(host) || !allowed) {
    throw new Error('Prohibited media destination');
  }
  return url;
}

export function publicMediaAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 2, 168].includes(b)) ||
      (a === 100 && b >= 64 && b <= 127) || (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
  }
  // Only native global unicast IPv6; reject mapped, local and transition ranges.
  const expanded = address.toLowerCase();
  const prefix = expanded.split(':');
  const second = Number.parseInt(prefix[1] || '0', 16);
  return isIP(address) === 6 && /^[23][0-9a-f]{3}:/.test(expanded) &&
    !(prefix[0] === '2001' && [0, 0xdb8].includes(second)) && prefix[0] !== '2002';
}

export async function downloadPublicImage(url: URL, accept: string): Promise<{ bytes: Buffer; contentType: string }> {
  const maxBytes = 20 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions & { autoSelectFamily: boolean } = {
      agent: false,
      autoSelectFamily: false,
      headers: { Accept: accept },
      // Pin the connection to a checked DNS answer; TLS validates the original host.
      lookup: (hostname, _options, callback) => {
        void lookup(hostname, { all: true }).then((addresses) => {
          if (!addresses.length || addresses.some(({ address }) => !publicMediaAddress(address))) {
            callback(new Error('Prohibited DNS address'), '', 4);
          } else {
            callback(null, addresses[0].address, addresses[0].family);
          }
        }).catch((error: Error) => callback(error, '', 4));
      },
    };
    const request = https.get(url, options, (response) => {
      const contentType = (response.headers['content-type'] ?? '').split(';')[0].toLowerCase();
      const size = Number(response.headers['content-length'] ?? 0);
      if (response.statusCode !== 200 || size > maxBytes || !['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'].includes(contentType)) {
        response.destroy(); reject(new Error('Invalid media response')); return;
      }
      const chunks: Buffer[] = [];
      let received = 0;
      response.on('data', (chunk: Buffer) => {
        received += chunk.length;
        if (received > maxBytes) { response.destroy(new Error('Media too large')); return; }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ bytes: Buffer.concat(chunks), contentType }));
      response.on('error', reject);
    });
    const timeout = setTimeout(() => request.destroy(new Error('Media timeout')), 30_000);
    request.on('close', () => clearTimeout(timeout));
    request.on('error', reject);
  });
}
