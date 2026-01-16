// Простое in-memory rate limiting
// В продакшене рекомендуется использовать Redis или специализированные сервисы

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map()
  private readonly CLEANUP_INTERVAL = 60 * 1000 // 1 минута

  constructor() {
    // Периодическая очистка старых записей
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL)
  }

  /**
   * Проверяет, не превышен ли лимит запросов
   * @param identifier Уникальный идентификатор (IP, userId и т.д.)
   * @param maxRequests Максимальное количество запросов
   * @param windowMs Окно времени в миллисекундах
   * @returns true если запрос разрешен, false если лимит превышен
   */
  check(identifier: string, maxRequests: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now()
    const entry = this.requests.get(identifier)

    if (!entry || now > entry.resetTime) {
      // Создаем новую запись или сбрасываем счетчик
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      })
      return true
    }

    if (entry.count >= maxRequests) {
      return false
    }

    entry.count++
    return true
  }

  /**
   * Получает оставшееся время до сброса лимита
   */
  getResetTime(identifier: string): number {
    const entry = this.requests.get(identifier)
    if (!entry) return 0
    return Math.max(0, entry.resetTime - Date.now())
  }

  /**
   * Очищает истекшие записи
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [identifier, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(identifier)
      }
    }
  }

  /**
   * Сбрасывает лимит для идентификатора
   */
  reset(identifier: string): void {
    this.requests.delete(identifier)
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

/**
 * Получает IP адрес из запроса
 * Поддерживает как NextRequest (App Router), так и NextApiRequest (Pages Router)
 */
export function getClientIp(req: any): string {
  // Для NextRequest (App Router)
  if (req && typeof req.headers?.get === 'function') {
    const forwarded = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    if (realIp) {
      return realIp
    }
    return 'unknown'
  }
  
  // Для NextApiRequest (Pages Router)
  const forwarded = req.headers?.['x-forwarded-for']
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim())
    : req.headers?.['x-real-ip'] 
    ? req.headers['x-real-ip']
    : req.socket?.remoteAddress
    ? req.socket.remoteAddress
    : 'unknown'
  
  return ip
}
