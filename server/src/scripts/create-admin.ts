/**
 * Creates the admin account, or resets its password if the email already exists.
 *
 *   npm run create-admin -- you@example.com
 *
 * The password is typed at a hidden prompt so it never lands in shell history.
 * Non-interactive: ADMIN_PASSWORD=... npm run create-admin -- you@example.com
 */
import { createInterface } from 'node:readline'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { connectDb, disconnectDb } from '../db.ts'
import { Admin } from '../models/index.ts'

const email = z.email().safeParse(process.argv[2])
if (!email.success) {
  console.error('Usage: npm run create-admin -- you@example.com')
  process.exit(1)
}

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    // Echo nothing while the password is typed
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput
    ;(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => {
      if (s.includes(question)) write.call(rl, s)
    }
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
  })
}

// ADMIN_PASSWORD allows non-interactive use (scripts, CI); otherwise prompt
const fromEnv = process.env.ADMIN_PASSWORD
const password = fromEnv ?? (await askHidden('Password (12+ characters): '))
if (password.length < 12) {
  console.error('Password must be at least 12 characters.')
  process.exit(1)
}
if (!fromEnv && (await askHidden('Repeat password: ')) !== password) {
  console.error('Passwords did not match.')
  process.exit(1)
}

await connectDb()
const passwordHash = await bcrypt.hash(password, 12)
const existing = await Admin.findOneAndUpdate({ email: email.data }, { passwordHash }, { new: true })
if (existing) console.log(`Password reset for ${email.data}.`)
else {
  await Admin.create({ email: email.data, passwordHash })
  console.log(`Admin ${email.data} created.`)
}
await disconnectDb()
