import { app } from './app.ts'
import { connectDb } from './db.ts'
import { env } from './env.ts'

// Local dev only. On Vercel, app.ts is wrapped as a function instead.
await connectDb()
app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}/api`)
})
