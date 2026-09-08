import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import type { Request, Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const request = host.switchToHttp().getRequest<Request>()
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const body = exception instanceof HttpException ? exception.getResponse() : null
    const details = typeof body === 'object' && body !== null ? body : undefined
    const message = typeof body === 'string'
      ? body
      : Array.isArray((body as { message?: unknown })?.message)
        ? '请求参数无效'
        : typeof (body as { message?: unknown })?.message === 'string'
          ? (body as { message: string }).message
          : status === 500 ? '服务器内部错误' : '请求失败'

    response.status(status).json({
      error: {
        statusCode: status,
        code: HttpStatus[status] ?? 'ERROR',
        message,
        details,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    })
  }
}
