import { useEffect, useState } from 'react'

type Tema = 'light' | 'dark'

function aplicarTema(tema: Tema) {
  if (tema === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function useTheme() {
  const [tema, setTema] = useState<Tema>(() => {
    const salvo = localStorage.getItem('fd-tema') as Tema | null
    if (salvo === 'dark' || salvo === 'light') return salvo
    // Respeita preferência do sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    aplicarTema(tema)
    localStorage.setItem('fd-tema', tema)
  }, [tema])

  // Aplica tema na montagem inicial
  useEffect(() => {
    const salvo = localStorage.getItem('fd-tema') as Tema | null
    const inicial = salvo ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    aplicarTema(inicial as Tema)
  }, [])

  function alternar() {
    setTema((t) => (t === 'light' ? 'dark' : 'light'))
  }

  return { tema, alternar }
}
