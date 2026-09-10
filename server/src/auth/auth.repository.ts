import { Injectable } from '@nestjs/common'
import { createHash, randomUUID } from 'crypto'
import { PrismaService } from '../database/prisma.service'

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCredentialByEmail(email: string) {
    return this.prisma.authCredential.findUnique({ where: { email: email.toLowerCase() } })
  }

  findCredentialByUserId(userId: string) {
    return this.prisma.authCredential.findUnique({ where: { profileId: userId } })
  }

  createUserWithCredential(email: string, passwordHash: string) {
    const profileId = randomUUID()
    return this.prisma.$transaction(async (tx) => {
      await tx.profile.create({ data: { id: profileId, displayName: email.split('@')[0] } })
      const credential = await tx.authCredential.create({
        data: { email: email.toLowerCase(), passwordHash, profileId },
      })
      return { profileId, credential }
    })
  }

  createSession(userId: string, refreshHash: string, expiresAt: Date) {
    return this.prisma.authSession.create({ data: { userId, refreshHash, expiresAt } })
  }

  findSessionByRefreshHash(refreshHash: string) {
    return this.prisma.authSession.findFirst({ where: { refreshHash } })
  }

  revokeSession(id: string, at = new Date()) {
    return this.prisma.authSession.update({ where: { id }, data: { revokedAt: at } })
  }
}

export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
