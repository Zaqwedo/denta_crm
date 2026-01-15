// Скрипт для запуска деплоя через Deploy Hook
// Использование: node deploy.js

const https = require('https');
const http = require('http');

const DEPLOY_HOOK_URL = process.env.VERCEL_DEPLOY_HOOK_URL;

if (!DEPLOY_HOOK_URL) {
  console.error('❌ Ошибка: VERCEL_DEPLOY_HOOK_URL не установлен');
  console.log('\n📋 Инструкция:');
  console.log('1. Перейдите в Vercel Dashboard → Settings → Git → Deploy Hooks');
  console.log('2. Создайте новый hook:');
  console.log('   - Name: "Manual Deploy"');
  console.log('   - Branch: "main"');
  console.log('3. Скопируйте URL hook\'а');
  console.log('4. Добавьте в .env.local:');
  console.log('   VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...');
  console.log('\nИли запустите напрямую:');
  console.log('VERCEL_DEPLOY_HOOK_URL=your-url node deploy.js');
  process.exit(1);
}

console.log('🚀 Запуск деплоя через Deploy Hook...\n');

const url = new URL(DEPLOY_HOOK_URL);
const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const client = url.protocol === 'https:' ? https : http;

const req = client.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Деплой успешно запущен!');
      console.log('⏳ Ожидайте 1-3 минуты для завершения сборки\n');
      console.log('Проверьте статус:');
      console.log('https://vercel.com/dashboard');
    } else {
      console.error(`❌ Ошибка при запуске деплоя (HTTP ${res.statusCode})`);
      console.error('Ответ:', data);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Ошибка подключения: ${e.message}`);
  process.exit(1);
});

req.end();