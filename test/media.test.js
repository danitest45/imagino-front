const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/server-media.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, { exports: exportsForTest, require, process: { env: {} }, URL, Buffer });

test('media proxy rejects private and arbitrary hosts before making a request', () => {
  for (const url of ['http://replicate.delivery/file', 'https://127.0.0.1', 'https://169.254.169.254/latest/meta-data', 'https://localhost', 'https://evil.test', 'https://replicate.delivery.evil.test', 'https://replicate.delivery:8443', 'https://user:secret@replicate.delivery/file']) {
    assert.throws(() => exportsForTest.allowedMediaUrl(url));
  }
  assert.equal(exportsForTest.allowedMediaUrl('https://cdn.replicate.delivery/file').hostname, 'cdn.replicate.delivery');
  assert.equal(exportsForTest.allowedMediaUrl('https://storage.example.test/file', 'storage.example.test').hostname, 'storage.example.test');
});

test('media proxy rejects private DNS answers, including IPv6 and mapped IPv4', () => {
  for (const ip of ['127.0.0.1', '10.1.1.1', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.100.100.200', '::1', '::ffff:127.0.0.1', 'fd00::1', 'fe80::1']) {
    assert.equal(exportsForTest.publicMediaAddress(ip), false, ip);
  }
  assert.equal(exportsForTest.publicMediaAddress('8.8.8.8'), true);
  assert.equal(exportsForTest.publicMediaAddress('2606:4700:4700::1111'), true);
});

function loadDownloader({ address = '8.8.8.8', status = 302, contentType = 'image/png', contentLength, body = Buffer.from('fixture') }) {
  const { EventEmitter } = require('node:events');
  const { Readable } = require('node:stream');
  const state = { requests: 0, socketAddress: null };
  const secureHttp = {
    get: (_url, options, respond) => {
      state.requests += 1;
      const request = new EventEmitter();
      request.destroy = (error) => { if (error) request.emit('error', error); request.emit('close'); };
      process.nextTick(() => options.lookup('cdn.replicate.delivery', {}, (error, chosen) => {
        if (error) { request.destroy(error); return; }
        state.socketAddress = chosen;
        const response = Readable.from([body]);
        response.statusCode = status;
        response.headers = { 'content-type': contentType, location: 'https://example.com/unexpected', ...(contentLength === undefined ? {} : { 'content-length': String(contentLength) }) };
        respond(response);
        response.on('close', () => request.emit('close'));
      }));
      return request;
    },
  };
  const output = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/server-media.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, {
    exports: output, URL, Buffer, setTimeout, clearTimeout, process: { env: {} },
    require: (name) => name === 'node:https' ? secureHttp : name === 'node:dns/promises' ? { lookup: async () => [{ address, family: 4 }] } : require(name),
  });
  return { output, state };
}

test('proxy pins the checked DNS result and refuses redirects', async () => {
  const { output, state } = loadDownloader({});
  await assert.rejects(output.downloadPublicImage(new URL('https://cdn.replicate.delivery/file'), 'image/png'));
  assert.equal(state.requests, 1);
  assert.equal(state.socketAddress, '8.8.8.8');
});

test('proxy aborts when an allowed host resolves to a private address', async () => {
  const { output, state } = loadDownloader({ address: '169.254.169.254', status: 200 });
  await assert.rejects(output.downloadPublicImage(new URL('https://cdn.replicate.delivery/file'), 'image/png'));
  assert.equal(state.socketAddress, null);
});

test('proxy permits only the exact configured staging host over HTTPS', () => {
  const host = 'pub-56f86851d1884a3b8e7a73f1624e4239.r2.dev';
  assert.equal(exportsForTest.allowedMediaUrl(`https://${host}/fixture.png`, host).hostname, host);
  assert.throws(() => exportsForTest.allowedMediaUrl(`http://${host}/fixture.png`, host));
  assert.throws(() => exportsForTest.allowedMediaUrl('https://example.com/fixture.png', host));
  assert.throws(() => exportsForTest.allowedMediaUrl('https://pub-00000000000000000000000000000000.r2.dev/fixture.png', host));
});

test('proxy rejects invalid MIME, declared oversized content and streaming overflow', async () => {
  for (const options of [
    { contentType: 'text/html' },
    { contentLength: 20 * 1024 * 1024 + 1 },
    { body: Buffer.alloc(20 * 1024 * 1024 + 1) },
  ]) {
    const { output, state } = loadDownloader({ status: 200, ...options });
    await assert.rejects(output.downloadPublicImage(new URL('https://cdn.replicate.delivery/fixture'), 'image/png'));
    assert.equal(state.requests, 1);
  }
});

test('proxy accepts a bounded image response and preserves its MIME', async () => {
  const fixture = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const { output } = loadDownloader({ status: 200, body: fixture, contentLength: fixture.length });
  const downloaded = await output.downloadPublicImage(new URL('https://cdn.replicate.delivery/fixture'), 'image/png');
  assert.equal(downloaded.contentType, 'image/png');
  assert.deepEqual(downloaded.bytes, fixture);
});
