// Тест безопасности RLS
// Запустите: node test-rls-security.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Переменные окружения SUPABASE_URL и SUPABASE_ANON_KEY не установлены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLSSecurity() {
  console.log('🛡️  Тестирование безопасности RLS...\n');

  try {
    // Тест 1: Попытка чтения без аутентификации
    console.log('1️⃣  Тест: Чтение пациентов без аутентификации');
    const { data: patientsData, error: patientsError } = await supabase
      .from('patients')
      .select('*')
      .limit(1);

    if (patientsError) {
      console.log('✅ Ожидаемо заблокировано:', patientsError.message);
    } else {
      console.log('❌ НЕОЖИДАННО: Данные получены без аутентификации!');
      console.log('Получено записей:', patientsData?.length || 0);
    }

    // Тест 2: Попытка чтения удаленных пациентов без аутентификации
    console.log('\n2️⃣  Тест: Чтение удаленных пациентов без аутентификации');
    const { data: deletedData, error: deletedError } = await supabase
      .from('deleted_patients')
      .select('*')
      .limit(1);

    if (deletedError) {
      console.log('✅ Ожидаемо заблокировано:', deletedError.message);
    } else {
      console.log('❌ НЕОЖИДАННО: Данные удаленных пациентов получены без аутентификации!');
      console.log('Получено записей:', deletedData?.length || 0);
    }

    // Тест 3: Попытка чтения истории изменений без аутентификации
    console.log('\n3️⃣  Тест: Чтение истории изменений без аутентификации');
    const { data: changesData, error: changesError } = await supabase
      .from('patient_changes')
      .select('*')
      .limit(1);

    if (changesError) {
      console.log('✅ Ожидаемо заблокировано:', changesError.message);
    } else {
      console.log('❌ НЕОЖИДАННО: История изменений получена без аутентификации!');
      console.log('Получено записей:', changesData?.length || 0);
    }

    // Тест 4: Анонимная аутентификация
    console.log('\n4️⃣  Тест: Анонимная аутентификация');
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

    if (authError) {
      console.log('❌ Ошибка анонимной аутентификации:', authError.message);
    } else {
      console.log('✅ Анонимная аутентификация успешна');
      console.log('User ID:', authData.user?.id);
      console.log('Role:', authData.user?.role);
    }

    // Тест 5: Чтение с анонимной аутентификацией
    if (!authError) {
      console.log('\n5️⃣  Тест: Чтение пациентов с анонимной аутентификацией');

      // Ждем немного для применения сессии
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .limit(1);

      if (patientsError) {
        console.log('❌ Ошибка чтения с аутентификацией:', patientsError.message);
      } else {
        console.log('✅ Данные получены с аутентификацией');
        console.log('Получено записей:', patientsData?.length || 0);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

testRLSSecurity();