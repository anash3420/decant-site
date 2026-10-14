import { Schema, model, type InferSchemaType } from 'mongoose'

const adminSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    /** bcrypt; never selected unless asked for explicitly */
    passwordHash: { type: String, required: true, select: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
)

export type AdminDoc = InferSchemaType<typeof adminSchema>
export const Admin = model('Admin', adminSchema)
