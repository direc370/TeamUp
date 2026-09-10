import bcrypt from 'bcryptjs'

export const PASSWORD_COST = 12

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, PASSWORD_COST)
}

export function verifyPassword(plain: string, stored: string): Promise<boolean> {
  return bcrypt.compare(plain, stored)
}
