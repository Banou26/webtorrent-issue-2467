import http from 'http'
import { Readable } from 'stream'

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

const clientResponse = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <div>Hello world</div>
  <script>
    fetch('http://localhost:3000/foo', { headers: { 'Cache-Control': 'no-store' } })
      .then(async (res) => {
        console.log(res.body)
        const reader = res.body?.getReader()
        for (let i = 25; i > 0; i--) {
          await new Promise(resolve => setTimeout(resolve, 10))
          const res = await reader?.read()
          if (res.done) break
          console.log(await reader?.read(), i)
        }
        console.log('waiting for 5s')
        await new Promise(resolve => setTimeout(resolve, 5_000))
        for (let i = 25; i > 0; i--) {
          await new Promise(resolve => setTimeout(resolve, 10))
          const res = await reader?.read()
          if (res.done) break
          console.log(await reader?.read(), i)
        }
        console.log('done')
      })
  </script>
</body>
</html>
`

http.createServer((req, res) => {
  if (req.url !== '/foo') {
    res.end(clientResponse)
    return
  }
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  })
  
  let i = 0
  const stream = Readable.fromWeb(new ReadableStream({
    start(controller) {
      controller.enqueue(`test ${i++}`)
    },
    async pull(controller) {
      console.log('being pulled', formatBytes(i))
      await new Promise(resolve => setTimeout(resolve, 100))
      controller.enqueue(new Uint8Array(1_000_000).fill(0))
      i += 1_000_000
    },
    cancel() {
      console.log('cancelled')
    }
  }))
  stream.pipe(res)
}).listen(3000, () => {})
