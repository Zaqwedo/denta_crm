import { describe, it, expect } from 'vitest'
import { findPotentialDuplicates } from './patient-utils'
import { ClientInfo } from '@/app/patients/card-index/types'

describe('patient-utils: findPotentialDuplicates', () => {
    it('should find duplicates with same phone but different names', () => {
        const mockData: ClientInfo[] = [
            {
                name: 'Иванов Иван',
                birthDate: '1990-01-01',
                phones: ['79991112233'],
                records: [],
                ignoredIds: []
            },
            {
                name: 'Иванов И.',
                birthDate: '1990-01-01',
                phones: ['79991112233'],
                records: [],
                ignoredIds: []
            },
            {
                name: 'Петров Петр',
                birthDate: '1985-05-05',
                phones: ['78885554433'],
                records: [],
                ignoredIds: []
            }
        ]

        const result = findPotentialDuplicates(mockData)

        expect(result).toHaveLength(1)
        expect(result[0].label).toContain('79991112233')
        expect(result[0].clients).toHaveLength(2)
        expect(result[0].clients.map(c => c.name)).toContain('Иванов Иван')
        expect(result[0].clients.map(c => c.name)).toContain('Иванов И.')
    })

    it('should ignore duplicate pairs that are in the ignoredIds list', () => {
        const pairId = ['Иванов И.|1990-01-01', 'Иванов Иван|1990-01-01'].sort().join(':::')

        const mockData: ClientInfo[] = [
            {
                name: 'Иванов Иван',
                birthDate: '1990-01-01',
                phones: ['79991112233'],
                records: [],
                ignoredIds: [pairId]
            },
            {
                name: 'Иванов И.',
                birthDate: '1990-01-01',
                phones: ['79991112233'],
                records: [],
                ignoredIds: [pairId]
            }
        ]

        const result = findPotentialDuplicates(mockData)
        expect(result).toHaveLength(0)
    })

    it('should handle formatted phone numbers correctly', () => {
        const mockData: ClientInfo[] = [
            {
                name: 'User 1',
                birthDate: null,
                phones: ['+7 (999) 111-22-33'],
                records: [],
                ignoredIds: []
            },
            {
                name: 'User 2',
                birthDate: null,
                phones: ['79991112233'],
                records: [],
                ignoredIds: []
            }
        ]

        const result = findPotentialDuplicates(mockData)
        expect(result).toHaveLength(1)
    })
})
