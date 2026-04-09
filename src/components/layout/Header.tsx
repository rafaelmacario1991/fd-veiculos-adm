interface HeaderProps {
  titulo: string
  subtitulo?: string
  acoes?: React.ReactNode
}

export default function Header({ titulo, subtitulo, acoes }: HeaderProps) {
  return (
    <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div>
        <h1 className="text-sm font-semibold text-gray-900">{titulo}</h1>
        {subtitulo && <p className="text-xs text-gray-500 mt-0.5">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex items-center gap-2">{acoes}</div>}
    </div>
  )
}
