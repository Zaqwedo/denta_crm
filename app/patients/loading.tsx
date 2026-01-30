export default function Loading() {
    return (
        <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                {/* Анимированный спиннер */}
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>

                {/* Текст загрузки */}
                <p className="text-gray-500 font-medium animate-pulse">
                    Загрузка...
                </p>
            </div>
        </div>
    )
}
