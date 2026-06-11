import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import {Request, Response} from 'express';
import {CustomLoggerService} from '@toolkit/logger/logger.service';

type HttpExceptionResponseBody = {
  message?: string | string[];
  error?: string;
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private loggerContext = 'HttpException';

  constructor(private readonly logger: CustomLoggerService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const statusCode = exception.getStatus(); // such as: 401
    const statusName = exception.name; // such as: UnauthorizedException
    const exceptionResponse = exception.getResponse() as
      | string
      | HttpExceptionResponseBody;
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse.message ?? exception.message);

    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();

    // [step 1] Assemble log content.
    let content = `${statusCode} ${statusName} >> ${request.method} ${request.url}`;

    if (request.body && Object.keys(request.body).length > 0) {
      content += ` ${JSON.stringify(request.body)}`;
    }
    content += ` >> ${Array.isArray(message) ? message.join(', ') : message}`;

    // [step 2] Write log.
    if (statusCode >= 500) {
      this.logger.error(content, this.loggerContext);
    } else if (statusCode >= 400) {
      this.logger.warn(content, this.loggerContext);
    } else {
      this.logger.log(content, this.loggerContext);
    }
    console.log(exception.stack);
    // [step 3] Response.
    if (typeof exceptionResponse === 'string') {
      response.status(statusCode).json({
        message,
        statusCode,
      });
      return;
    }

    response.status(statusCode).json({
      statusCode,
      ...(exceptionResponse.error ? {error: exceptionResponse.error} : {}),
      message,
    });
  }
}
