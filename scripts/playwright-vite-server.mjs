import { createServer } from 'vite'

const port = Number(process.argv[2] || process.env.PLAYWRIGHT_PORT || 4173)

const server = await createServer({
  server: {
    host: '127.0.0.1',
    port,
    strictPort: true,
  },
})

await server.listen()
server.printUrls()

async function closeServer() {
  await server.close()
  process.exit(0)
}

process.on('SIGINT', closeServer)
process.on('SIGTERM', closeServer)
