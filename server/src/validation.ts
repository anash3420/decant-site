import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

/** A MongoDB id in a URL or body */
export const objectId = z.string().refine(isValidObjectId, 'Invalid id')

/** Case-insensitive "contains" match for admin search boxes, with regex characters escaped */
export const searchRegex = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
