#!/bin/bash

# Скрипт для запуска деплоя через Deploy Hook
# Использование: ./deploy.sh

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Запуск деплоя через Deploy Hook...${NC}\n"

# Проверка наличия URL
if [ -z "$VERCEL_DEPLOY_HOOK_URL" ]; then
    echo -e "${RED}❌ Ошибка: VERCEL_DEPLOY_HOOK_URL не установлен${NC}"
    echo -e "${YELLOW}📋 Инструкция:${NC}"
    echo "1. Перейдите в Vercel Dashboard → Settings → Git → Deploy Hooks"
    echo "2. Создайте новый hook:"
    echo "   - Name: 'Manual Deploy'"
    echo "   - Branch: 'main'"
    echo "3. Скопируйте URL hook'а"
    echo "4. Добавьте в .env.local:"
    echo "   VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/..."
    echo ""
    exit 1
fi

# Запуск деплоя
echo -e "${GREEN}📤 Отправка запроса на деплой...${NC}"
RESPONSE=$(curl -X POST "$VERCEL_DEPLOY_HOOK_URL" -w "\n%{http_code}" -s)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✅ Деплой успешно запущен!${NC}"
    echo -e "${YELLOW}⏳ Ожидайте 1-3 минуты для завершения сборки${NC}"
    echo ""
    echo "Проверьте статус:"
    echo "https://vercel.com/dashboard"
else
    echo -e "${RED}❌ Ошибка при запуске деплоя (HTTP $HTTP_CODE)${NC}"
    echo "Ответ: $BODY"
    exit 1
fi