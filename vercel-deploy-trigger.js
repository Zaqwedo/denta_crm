// Скрипт для диагностики и запуска деплоя Vercel
// Использование: node vercel-deploy-trigger.js

const https = require('https');

console.log('🔍 Диагностика Vercel + GitHub интеграции...\n');

// Проверить переменные окружения
console.log('1. Проверка переменных окружения:');
console.log('   VERCEL_TOKEN:', process.env.VERCEL_TOKEN ? '✅ Установлен' : '❌ Не установлен');
console.log('   VERCEL_PROJECT_ID:', process.env.VERCEL_PROJECT_ID ? '✅ Установлен' : '❌ Не установлен');

// Проверить подключение к GitHub
console.log('\n2. Проверка GitHub репозитория:');
const repoUrl = 'https://api.github.com/repos/Zaqwedo/denta-crm-v2';
console.log('   Репозиторий:', repoUrl);

// Проверить Vercel API (если есть токен)
if (process.env.VERCEL_TOKEN) {
  console.log('\n3. Проверка Vercel API:');

  const options = {
    hostname: 'api.vercel.com',
    path: '/v9/projects',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    console.log('   Статус Vercel API:', res.statusCode);

    if (res.statusCode === 200) {
      console.log('   ✅ Vercel API доступен');
    } else {
      console.log('   ❌ Проблема с Vercel API');
    }
  });

  req.on('error', (e) => {
    console.log('   ❌ Ошибка подключения к Vercel API:', e.message);
  });

  req.end();
} else {
  console.log('\n3. Vercel API не проверен (нет токена)');
}

console.log('\n📋 РЕКОМЕНДАЦИИ:');
console.log('1. Перейдите в Vercel Dashboard');
console.log('2. Выберите проект denta-crm');
console.log('3. Перейдите в Settings → Git');
console.log('4. Проверьте GitHub интеграцию');
console.log('5. Если проблема - нажмите "Reconnect"');
console.log('6. Ручной деплой: Deployments → Trigger Deploy');

console.log('\n🔧 АЛЬТЕРНАТИВНЫЙ СПОСОБ:');
console.log('Если интеграция не работает, пересоздайте проект:');
console.log('1. Удалите проект в Vercel');
console.log('2. Создайте новый: Add New Project');
console.log('3. Import из GitHub репозитория');
console.log('4. Настройте переменные окружения');

console.log('\n⚡ БЫСТРЫЙ ФИКС:');
console.log('Vercel Dashboard → Trigger Deploy → Выберите main ветку');

console.log('\n🎯 ИТОГ:');
console.log('Vercel должен автоматически деплоить при push в main.');
console.log('Если нет - проверьте интеграцию или используйте Trigger Deploy.');