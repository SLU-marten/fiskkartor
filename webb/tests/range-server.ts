// En liten statisk server med stöd för HTTP Range och CORS, som GitHub Pages eller en
// lagringstjänst. Används av testerna för att läsa COG-filer på samma sätt som i drift.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, resolve, sep } from 'node:path';

const TYPER: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.tif': 'image/tiff',
};

function avsluta(res: ServerResponse, status: number, huvuden: Record<string, string | number> = {}) {
  res.writeHead(status, huvuden);
  res.end();
}

// Tolkar "bytes=a-b", "bytes=a-" och "bytes=-n". Flera intervall stöds inte (null = hela filen).
function tolkaRange(huvud: string, storlek: number): [number, number] | 'ogiltig' | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(huvud.trim());
  if (!m) return huvud.includes(',') ? null : 'ogiltig';
  let start: number;
  let slut: number;
  if (m[1] === '') {
    const n = Number(m[2]);
    if (!n) return 'ogiltig';
    start = Math.max(0, storlek - n);
    slut = storlek - 1;
  } else {
    start = Number(m[1]);
    slut = m[2] === '' ? storlek - 1 : Math.min(Number(m[2]), storlek - 1);
  }
  return start > slut || start >= storlek ? 'ogiltig' : [start, slut];
}

export async function startaRangeServer(rot: string, port = 0): Promise<{ url: string; stang: () => Promise<void> }> {
  const bas = resolve(rot);
  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
    res.setHeader('Accept-Ranges', 'bytes');
    if (req.method === 'OPTIONS') {
      return avsluta(res, 204, { 'Access-Control-Allow-Headers': 'Range', 'Access-Control-Allow-Methods': 'GET, HEAD' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return avsluta(res, 405);

    let sokvag: string;
    try {
      sokvag = resolve(bas, '.' + decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
    } catch {
      return avsluta(res, 400);
    }
    if (sokvag !== bas && !sokvag.startsWith(bas + sep)) return avsluta(res, 403);

    let info;
    try {
      info = await stat(sokvag);
      if (info.isDirectory()) {
        sokvag = join(sokvag, 'index.html');
        info = await stat(sokvag);
      }
    } catch {
      return avsluta(res, 404);
    }

    const storlek = info.size;
    const typ = TYPER[extname(sokvag).toLowerCase()] ?? 'application/octet-stream';
    const intervall = req.headers.range ? tolkaRange(req.headers.range, storlek) : null;
    if (intervall === 'ogiltig') return avsluta(res, 416, { 'Content-Range': `bytes */${storlek}` });

    const [start, slut] = intervall ?? [0, storlek - 1];
    res.writeHead(intervall ? 206 : 200, {
      'Content-Type': typ,
      'Content-Length': storlek === 0 ? 0 : slut - start + 1,
      ...(intervall ? { 'Content-Range': `bytes ${start}-${slut}/${storlek}` } : {}),
    });
    if (req.method === 'HEAD' || storlek === 0) return res.end();
    createReadStream(sokvag, { start, end: slut }).on('error', () => res.destroy()).pipe(res);
  });

  await new Promise<void>((ok) => server.listen(port, '127.0.0.1', ok));
  const { port: faktisk } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${faktisk}`,
    stang: () =>
      new Promise<void>((ok, fel) => {
        server.closeAllConnections();
        server.close((e) => (e ? fel(e) : ok()));
      }),
  };
}
