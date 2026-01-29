'use client'

interface SegmentedControlProps {
  options: string[]
  selectedIndex: number
  onChange: (index: number) => void
}

export function SegmentedControl({ options, selectedIndex, onChange }: SegmentedControlProps) {
  return (
    <div className="inline-flex bg-gray-100 p-1 rounded-[12px]">
      {options.map((option, index) => (
        <button
          key={option}
          onClick={() => onChange(index)}
          className={`px-4 py-2 text-sm font-medium rounded-[8px] transition-colors ${
            selectedIndex === index
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}