import mongoose from 'mongoose'
import { env } from './env.ts'

// On Vercel each warm function instance reuses one connection instead of opening one per request
let connecting: Promise<typeof mongoose> | null = null

export function connectDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose)
  connecting ??= mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 }).catch((err) => {
    connecting = null
    throw err
  })
  return connecting
}

export const disconnectDb = () => mongoose.disconnect()
