-- Создание таблицы для поддержки нескольких устройств биометрии
CREATE TABLE IF NOT EXISTS user_biometrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    device_name TEXT,
    counter INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_biometrics_email ON user_biometrics(user_email);

-- Перенос существующих данных
INSERT INTO user_biometrics (user_email, credential_id, public_key)
SELECT email, biometric_credential_id, biometric_public_key 
FROM users 
WHERE biometric_credential_id IS NOT NULL
ON CONFLICT (credential_id) DO NOTHING;
