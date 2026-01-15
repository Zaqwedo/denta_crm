/**
 * Форматирует время в формат HH:MM (час:минута) без секунд
 * @param time - Время в формате HH:MM:SS или HH:MM
 * @returns Время в формате HH:MM или пустая строка, если время не указано
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return ''
  
  // Если время уже в формате HH:MM, возвращаем как есть
  if (time.match(/^\d{1,2}:\d{2}$/)) {
    return time
  }
  
  // Если время в формате HH:MM:SS, берем только первые 5 символов
  if (time.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
    return time.substring(0, 5)
  }
  
  // Пытаемся извлечь часы и минуты из любого формата
  const parts = time.split(':')
  if (parts.length >= 2) {
    const hours = parts[0].padStart(2, '0')
    const minutes = parts[1].padStart(2, '0')
    return `${hours}:${minutes}`
  }
  
  return time
}
