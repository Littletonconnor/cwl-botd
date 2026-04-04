import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')
const integrationDir = __dirname

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  let filePath

  if (url.pathname === '/' || url.pathname === '/index.html') {
    filePath = path.join(integrationDir, 'test-page.html')
  } else if (url.pathname.endsWith('.js') || url.pathname.endsWith('.js.map')) {
    filePath = path.join(distDir, path.basename(url.pathname))
  } else {
    filePath = path.join(integrationDir, path.basename(url.pathname))
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const ext = path.extname(filePath)
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  res.writeHead(200, { 'Content-Type': contentType })
  fs.createReadStream(filePath).pipe(res)
})

server.listen(3999, () => {
  console.log('Integration test server listening on http://localhost:3999')
})
