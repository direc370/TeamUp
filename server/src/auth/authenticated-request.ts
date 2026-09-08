import type { Request } from 'express'
import type { AuthenticatedUser } from './authenticator'

export type AuthenticatedRequest = Request & { user: AuthenticatedUser }
