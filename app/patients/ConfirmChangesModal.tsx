'use client'

interface ConfirmChangesModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  onCancel: () => void
  changes: Array<{ field: string; oldValue: string; newValue: string }>
}

export function ConfirmChangesModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onCancel,
  changes 
}: ConfirmChangesModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div 
        className="bg-white rounded-[20px] shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Есть несохраненные изменения
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-700 mb-4">
            Вы внесли следующие изменения:
          </p>
          
          <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
            {changes.map((change, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {change.field}
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>
                    <span className="text-red-600 line-through">
                      {change.oldValue || '(пусто)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-600">
                      → {change.newValue || '(пусто)'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-gray-600 text-sm mb-4">
            Применить эти изменения?
          </p>
        </div>

        {/* Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-[12px] font-semibold hover:bg-gray-300 transition-colors"
          >
            Отменить
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-[12px] font-semibold hover:bg-blue-700 transition-colors"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  )
}
