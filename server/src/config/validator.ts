export interface ValidatedConfig extends Record<string, unknown> {
  PORT: number
  NODE_ENV: 'development' | 'test' | 'production'
  CORS_ORIGINS: string
  DATABASE_URL: string
  AUTH_JWT_SECRET: string
}

function invalid(field: string, rule: string): never {
  throw new Error(`配置错误：${field} ${rule}`)
}

function requiredString(config: Record<string, unknown>, field: string): string {
  const value = config[field]
  if (typeof value !== 'string' || !value.trim()) invalid(field, '必须提供非空字符串')
  return value
}

export function validateConfig(config: Record<string, unknown>): ValidatedConfig {
  const rawPort = config.PORT === undefined ? 3000 : config.PORT
  if ((typeof rawPort !== 'string' && typeof rawPort !== 'number') || !/^\d+$/.test(String(rawPort))) {
    invalid('PORT', '必须为 1..65535 的整数')
  }
  const port = Number(rawPort)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) invalid('PORT', '必须为 1..65535 的整数')

  const nodeEnv = config.NODE_ENV === undefined ? 'development' : config.NODE_ENV
  if (nodeEnv !== 'development' && nodeEnv !== 'test' && nodeEnv !== 'production') {
    invalid('NODE_ENV', '仅允许 development、test、production')
  }

  const origins = requiredString(config, 'CORS_ORIGINS').split(',').map((origin) => origin.trim())
  for (const origin of origins) {
    let url: URL
    try {
      url = new URL(origin)
    } catch {
      invalid('CORS_ORIGINS', '必须为逗号分隔的合法 HTTP(S) origin')
    }
    // 在 URL 归一化之前拒绝路径、空凭据、空查询等非 origin 写法。
    if (!/^https?:\/\/[^\s\\/?#@*]+$/i.test(origin) || !url.hostname || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      invalid('CORS_ORIGINS', '仅允许 HTTP(S) origin，不得含凭据、路径、查询、fragment 或通配符')
    }
  }

  const databaseUrl = requiredString(config, 'DATABASE_URL')
  let database: URL
  try {
    database = new URL(databaseUrl)
  } catch {
    invalid('DATABASE_URL', '必须为合法 PostgreSQL URL，包含 host 与数据库名')
  }
  if (!/^postgres(?:ql)?:\/\//.test(databaseUrl) || /[\s\\]/.test(databaseUrl) || !['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname || !/^\/[^/]+$/.test(database.pathname) || database.hash || databaseUrl.includes('#')) {
    invalid('DATABASE_URL', '必须为合法 PostgreSQL URL，包含 host 与数据库名')
  }
  try {
    const name = decodeURIComponent(database.pathname.slice(1))
    if (!name.trim() || /[\s/\\\u0000]/.test(name)) invalid('DATABASE_URL', '必须包含有效数据库名')
  } catch {
    invalid('DATABASE_URL', '必须包含有效数据库名')
  }

  const secret = requiredString(config, 'AUTH_JWT_SECRET')
  if (secret.trim().length < 32 || /replace[\s_-]*with|change[\s_-]*me|placeholder|your[\s_-]*(?:jwt[\s_-]*)?secret|example|sample/i.test(secret)) {
    invalid('AUTH_JWT_SECRET', '必须至少 32 个字符且不能使用示例占位符')
  }

  return { ...config, PORT: port, NODE_ENV: nodeEnv, CORS_ORIGINS: origins.map((origin) => new URL(origin).origin).join(','), DATABASE_URL: databaseUrl, AUTH_JWT_SECRET: secret }
}
