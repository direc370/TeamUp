import { Module } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validateConfig } from './validator'

const valid = () => ({
  PORT: '3000', NODE_ENV: 'development', CORS_ORIGINS: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/saiban?schema=public',
  AUTH_JWT_SECRET: '8b6d24c9a13e507f92d4b68c1f0a735e',
})

describe('validateConfig', () => {
  it('返回新对象且不修改输入，PORT 是真正数字', () => {
    const input = Object.freeze(valid())
    const result = validateConfig(input)
    expect(result).not.toBe(input)
    expect(result.PORT).toBe(3000)
    expect(input.PORT).toBe('3000')
  })
  it('仅为未提供的 PORT 和 NODE_ENV 使用缺省值', () => {
    expect(validateConfig({ ...valid(), PORT: undefined, NODE_ENV: undefined })).toMatchObject({ PORT: 3000, NODE_ENV: 'development' })
  })
  it.each(['1', '65535', 3000])('接受边界及数字端口 %s', (PORT) => {
    expect(validateConfig({ ...valid(), PORT }).PORT).toBe(Number(PORT))
  })
  it.each(['', ' ', '0', '65536', '-1', '1.5', '1e3', '0x10', 'NaN', 'Infinity', ' 3000 ', null, true, 1.5, Infinity, {}, '99999999999999999999'])('拒绝非法端口 %#', (PORT) => {
    expect(() => validateConfig({ ...valid(), PORT })).toThrow('PORT')
  })
  it.each(['development', 'test', 'production'])('接受运行环境 %s', (NODE_ENV) => {
    expect(validateConfig({ ...valid(), NODE_ENV }).NODE_ENV).toBe(NODE_ENV)
  })
  it.each(['', 'staging', 'PRODUCTION', null, 1])('拒绝非法运行环境 %#', (NODE_ENV) => {
    expect(() => validateConfig({ ...valid(), NODE_ENV })).toThrow('NODE_ENV')
  })
  it.each(['http://localhost:5173', 'https://example.com', 'http://[::1]:3000', ' https://a.example , http://localhost:3000 '])('接受严格 origin %#', (CORS_ORIGINS) => {
    expect(validateConfig({ ...valid(), CORS_ORIGINS }).CORS_ORIGINS).toBe(CORS_ORIGINS.split(',').map((s) => s.trim()).join(','))
  })
  it.each(['', '*', 'https://*.example.com', 'ftp://example.com', 'https://user:pass@example.com', 'https://@example.com', 'https://example.com/', 'https://example.com/path', 'https://example.com/..', 'https://example.com?', 'https://example.com?q=1', 'https://example.com#', 'https://example.com#fragment', 'https://example.com,', ',https://example.com', 'https://a.example,,https://b.example', 'https://', 'https://example.com:99999', 'https://exa mple.com', 'https://example.com\\evil', 'https:example.com', 'https://exam\nple.com'])('拒绝非法 origin %#', (CORS_ORIGINS) => {
    expect(() => validateConfig({ ...valid(), CORS_ORIGINS })).toThrow('CORS_ORIGINS')
  })
  it('将大小写主机及默认端口规范为浏览器 Origin', () => {
    expect(validateConfig({ ...valid(), CORS_ORIGINS: 'https://EXAMPLE.com:443,http://LOCALHOST:80' }).CORS_ORIGINS).toBe('https://example.com,http://localhost')
  })
  it.each(['postgres://localhost/db', 'postgresql://u:p@[::1]:5432/db?schema=public'])('接受 PostgreSQL 地址 %#', (DATABASE_URL) => {
    expect(validateConfig({ ...valid(), DATABASE_URL }).DATABASE_URL).toBe(DATABASE_URL)
  })
  it.each(['', 'not-a-url', 'mysql://localhost/db', 'postgresql:///db', 'postgresql://localhost', 'postgresql://localhost/', 'postgresql://localhost/db/extra', 'postgresql://localhost:99999/db', 'postgresql://localhost/%20', 'postgresql://localhost/%ZZ', 'postgresql://localhost/db#fragment', 'postgresql://localhost/db#', 'postgresql://localhost/%2F', 'postgresql://local host/db'])('拒绝非法数据库地址 %#', (DATABASE_URL) => {
    expect(() => validateConfig({ ...valid(), DATABASE_URL })).toThrow('DATABASE_URL')
  })
  it.each(['CORS_ORIGINS', 'DATABASE_URL', 'AUTH_JWT_SECRET'])('拒绝缺失必需字段 %s', (field) => {
    const input: Record<string, unknown> = valid()
    delete input[field]
    expect(() => validateConfig(input)).toThrow(field)
  })
  it.each(['', 'x'.repeat(31), ' '.repeat(32), 'replace-with-at-least-32-random-characters', 'CHANGE_ME_' + 'x'.repeat(32), 'placeholder-' + 'x'.repeat(32), 'your-jwt-secret-' + 'x'.repeat(32)])('拒绝过短或占位密钥 %#', (AUTH_JWT_SECRET) => {
    expect(() => validateConfig({ ...valid(), AUTH_JWT_SECRET })).toThrow('AUTH_JWT_SECRET')
  })
  it('接受恰好 32 个字符的非占位密钥', () => {
    expect(validateConfig(valid()).AUTH_JWT_SECRET).toHaveLength(32)
  })
  it.each(['DATABASE_URL', 'AUTH_JWT_SECRET', 'CORS_ORIGINS', 'PORT', 'NODE_ENV'])('错误不回显敏感值 %s', (field) => {
    const marker = 'sensitive-value-not-for-logs'
    try {
      validateConfig({ ...valid(), [field]: marker })
      throw new Error('校验未失败')
    } catch (error) {
      expect((error as Error).message).toContain(field)
      expect((error as Error).message).not.toContain(marker)
      expect((error as Error).message).not.toContain(valid().AUTH_JWT_SECRET)
    }
  })
  it('ConfigModule 集成后 ConfigService 返回数字端口且不读取环境文件', async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true, ignoreEnvVars: true, skipProcessEnv: true, validate: () => validateConfig(valid()) })],
    }).compile()
    try {
      expect(module.get(ConfigService).getOrThrow('PORT')).toBe(3000)
    } finally {
      await module.close()
    }
  })
  it('默认 Express 适配器可以初始化空应用，不加载数据库也不监听端口', async () => {
    @Module({})
    class SmokeModule {}
    const app = await NestFactory.create(SmokeModule, { logger: false, abortOnError: false })
    try {
      await app.init()
      expect(app.getHttpAdapter().getType()).toBe('express')
    } finally {
      await app.close()
    }
  })
  it('ConfigModule 在配置非法时立即拒绝初始化', async () => {
    await expect(ConfigModule.forRoot({ ignoreEnvFile: true, ignoreEnvVars: true, validate: () => validateConfig({ ...valid(), PORT: '0' }) })).rejects.toThrow('PORT')
  })
})
