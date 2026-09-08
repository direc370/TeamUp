export type AuthenticatedUser = { id: string }

export const AUTHENTICATOR = Symbol('AUTHENTICATOR')

export interface Authenticator {
  authenticate(token: string): Promise<AuthenticatedUser>
}
