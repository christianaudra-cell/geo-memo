import { spawn } from 'node:child_process'
import { createServer } from 'vite'

const port = Number(process.env.PLAYWRIGHT_PORT || 4173)
const args = process.argv.slice(2)
const server = await createServer({
  server: {
    host: '127.0.0.1',
    port,
    strictPort: true,
  },
})

await server.listen()
server.printUrls()

const child = spawn(process.execPath, ['./node_modules/playwright/cli.js', 'test', ...args], {
  env: {
    ...process.env,
    PLAYWRIGHT_PORT: String(port),
    PLAYWRIGHT_SKIP_WEBSERVER: '1',
  },
  shell: false,
  stdio: 'inherit',
})

child.on('exit', async (code) => {
  await server.close()
  process.exit(code ?? 1)
})

async function stop() {
  child.kill()
  await server.close()
  process.exit(1)
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
