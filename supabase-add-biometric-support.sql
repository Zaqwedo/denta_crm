-- Миграция: Добавление поддержки биометрии (WebAuthn / FaceID)
-- Выполните этот скрипт в SQL Editor в Supabase

ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_credential_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_public_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_counter INTEGER DEFAULT 0;

COMMENT ON COLUMN users.biometric_credential_id IS 'ID учетных данных WebAuthn (FaceID/TouchID)';
COMMENT ON COLUMN users.biometric_public_key IS 'Публичный ключ WebAuthn для проверки подписи';
COMMENT ON COLUMN users.biometric_counter IS 'Счетчик использований WebAuthn для предотвращения повторов';
