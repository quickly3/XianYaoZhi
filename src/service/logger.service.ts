import { LoggerService } from '@nestjs/common';

/**
 * 适用于 nest-commander CLI 的自定义日志服务。
 * 实现 NestJS LoggerService 接口，统一输出格式，便于调试和追踪。
 */
export class LogService implements LoggerService {
  private context?: string;

  /**
   * 普通日志
   */
  log(message: any, ...optionalParams: any[]): void {
    const ctx = this.extractContext(optionalParams);
    console.log(`[LOG]${ctx} ${this.formatMessage(message)}`);
  }

  /**
   * 错误日志
   */
  error(message: any, ...optionalParams: any[]): void {
    const ctx = this.extractContext(optionalParams);
    console.error(`[ERROR]${ctx} ${this.formatMessage(message)}`);
  }

  /**
   * 警告日志
   */
  warn(message: any, ...optionalParams: any[]): void {
    const ctx = this.extractContext(optionalParams);
    console.warn(`[WARN]${ctx} ${this.formatMessage(message)}`);
  }

  /**
   * 调试日志
   */
  debug?(message: any, ...optionalParams: any[]): void {
    const ctx = this.extractContext(optionalParams);
    console.debug(`[DEBUG]${ctx} ${this.formatMessage(message)}`);
  }

  /**
   * 详细日志
   */
  verbose?(message: any, ...optionalParams: any[]): void {
    const ctx = this.extractContext(optionalParams);
    console.log(`[VERBOSE]${ctx} ${this.formatMessage(message)}`);
  }

  /**
   * 设置日志上下文（模块/类名）
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * 从可选参数中提取 context 字符串
   */
  private extractContext(params: any[]): string {
    if (params.length > 0 && typeof params[0] === 'string') {
      return ` [${params[0]}]`;
    }
    if (this.context) {
      return ` [${this.context}]`;
    }
    return '';
  }

  /**
   * 格式化消息，支持 Error 对象和普通字符串
   */
  private formatMessage(message: any): string {
    if (message instanceof Error) {
      return `${message.message}\n${message.stack}`;
    }
    if (typeof message === 'object') {
      try {
        return JSON.stringify(message, null, 2);
      } catch {
        return String(message);
      }
    }
    return String(message);
  }
}
