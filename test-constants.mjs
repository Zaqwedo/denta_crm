// Тестовый файл для проверки констант
import { DOCTORS, NURSES, PATIENT_STATUSES } from './lib/constants.ts';

console.log('=== ТЕСТ КОНСТАНТ ===');
console.log('DOCTORS:', DOCTORS);
console.log('NURSES:', NURSES);
console.log('PATIENT_STATUSES:', PATIENT_STATUSES);

console.log('\n=== ПРОВЕРКА ДЛИНЫ ===');
console.log('Кол-во докторов:', DOCTORS.length);
console.log('Кол-во медсестер:', NURSES.length);
console.log('Кол-во статусов:', PATIENT_STATUSES.length);