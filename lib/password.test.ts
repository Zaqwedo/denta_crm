import { describe, it, expect } from 'vitest'
import { hashPin, verifyPin } from './password'

describe('password utils: PIN hashing', () => {
    it('should hash and verify a correct PIN', async () => {
        const pin = '1234'
        const hash = await hashPin(pin)

        expect(hash).toContain('100000.') // Итерации

        const isValid = await verifyPin(pin, hash)
        expect(isValid).toBe(true)
    })

    it('should fail for an incorrect PIN', async () => {
        const pin = '1234'
        const wrongPin = '4321'
        const hash = await hashPin(pin)

        const isValid = await verifyPin(wrongPin, hash)
        expect(isValid).toBe(false)
    })

    it('should produce different hashes for the same PIN (due to salt)', async () => {
        const pin = '1234'
        const hash1 = await hashPin(pin)
        const hash2 = await hashPin(pin)

        expect(hash1).not.toBe(hash2)
    })
})
