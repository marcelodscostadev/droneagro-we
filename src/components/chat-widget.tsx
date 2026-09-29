import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, User, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { GoogleGenerativeAI } from '@google/generative-ai'

// SDK com endpoint v1 que suporta gemini-2.0-flash
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '')

const SYSTEM_INSTRUCTION = "Você é o Assistente Especialista em Drones e Agronegócio do sistema DroneAgro. Responda de forma clara, prestativa e objetiva. Você entende tudo sobre pulverização, hectares, relatórios financeiros e operação de drones. Quando usar markdown, seja bem formatado."

interface Message {
  role: 'user' | 'model'
  content: string
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: 'Olá! Sou o **Assistente Inteligente do DroneAgro**. Posso ajudar com análises de safra, relatórios financeiros ou tirar dúvidas operacionais. O que deseja?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showBubble, setShowBubble] = useState(true)
  
  // Voice State
  const [isListening, setIsListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false) // Mute para a IA parar de falar
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  // Bubble Logic
  useEffect(() => {
    let timeout = setTimeout(() => setShowBubble(false), 8000)
    let interval = setInterval(() => {
      setShowBubble(true)
      timeout = setTimeout(() => setShowBubble(false), 8000)
    }, 300000) // 5 minutes
    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [])

  // Auto Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'pt-BR'

      recognition.onresult = (event: any) => {
        let currentTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript
        }
        setInput(currentTranscript)
      }

      recognition.onerror = (event: any) => {
        console.error('Erro de reconhecimento de voz', event.error)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      if (recognitionRef.current) {
        setInput('')
        recognitionRef.current.start()
        setIsListening(true)
      } else {
        alert("Reconhecimento de voz não suportado neste navegador.")
      }
    }
  }

  // Text to Speech
  const speak = (text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return
    
    // Para falas anteriores
    window.speechSynthesis.cancel()

    // Remove marcadores markdown fortes para ler mais naturalmente
    const cleanText = text.replace(/[*_#]/g, '')

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'pt-BR'
    utterance.rate = 1.1
    
    window.speechSynthesis.speak(utterance)
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    
    // Se estiver ouvindo, para de ouvir ao enviar
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    }

    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('Chave de API do Gemini ausente.')

      // Monta histórico para enviar
      const contents = newMessages.slice(1).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }))

      // Chamada direta ao endpoint v1 (suporta gemini-3.8-flash)
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            contents
          })
        }
      )

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error?.message || `HTTP ${res.status}`)
      }

      const data = await res.json()
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.'

      setMessages(prev => [...prev, { role: 'model', content: responseText }])
      speak(responseText)
      
    } catch (error: any) {
      console.error(error)
      const errorMsg = error.message === 'Chave de API do Gemini ausente.' 
        ? 'Ops! Falta configurar a VITE_GEMINI_API_KEY no arquivo .env!' 
        : `Erro do Gemini: ${error.message || 'Falha de conexão'}`
      
      setMessages(prev => [...prev, { role: 'model', content: errorMsg }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-24 right-8 z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <Card className="w-[95vw] sm:w-[450px] md:w-[500px] h-[75vh] max-h-[800px] flex flex-col shadow-2xl overflow-hidden border-primary/20">
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between bg-emerald-950 text-white rounded-t-xl">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              Agro Assistente IA
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white hover:text-emerald-400 hover:bg-white/10" 
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? "Ativar Áudio da IA" : "Silenciar IA"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white hover:text-emerald-400 hover:bg-white/10" 
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-zinc-50 dark:bg-zinc-950/50">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-emerald-900 text-emerald-400'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap' : 'bg-white dark:bg-zinc-900 border border-border/50 text-foreground rounded-tl-sm'}`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-p:leading-relaxed prose-pre:p-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2 max-w-[80%] flex-row">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-900 text-emerald-400">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 rounded-tl-sm text-sm bg-white dark:bg-zinc-900 border border-border/50 text-foreground flex items-center gap-1 shadow-sm">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <CardFooter className="p-3 border-t bg-white dark:bg-zinc-950 flex flex-col gap-2">
            <form onSubmit={handleSend} className="flex w-full gap-2 items-center bg-zinc-100 dark:bg-zinc-900 rounded-full p-1 pl-3 pr-1 border border-border/50 focus-within:ring-2 ring-primary/50 transition-all">
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Ouvindo você..." : "Pergunte algo..."}
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground focus:ring-0"
                disabled={isLoading}
              />
              <Button 
                type="button" 
                size="icon" 
                variant={isListening ? "destructive" : "ghost"} 
                className={`shrink-0 rounded-full h-8 w-8 transition-all ${isListening ? 'animate-pulse' : 'hover:bg-primary/10 hover:text-primary'}`} 
                onClick={toggleListening}
                disabled={isLoading}
                title={isListening ? "Parar Gravação" : "Falar com IA"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button 
                type="submit" 
                size="icon" 
                className="rounded-full h-8 w-8 shrink-0 bg-primary hover:bg-primary/90"
                disabled={isLoading || !input.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}

      {!isOpen && (
        <div className="flex items-center justify-end relative group">
          {showBubble && (
            <div className="absolute right-[85px] top-1/2 -translate-y-1/2 whitespace-nowrap animate-in fade-in slide-in-from-right-4 duration-500 z-10">
              <div className="bg-white dark:bg-zinc-900 shadow-xl rounded-[2rem] px-5 py-3 text-sm font-medium text-foreground relative flex items-center gap-3 border border-border/50">
                <span>Precisa de uma mão nas <span className="font-bold text-primary">Propostas</span> ou <span className="font-bold text-primary">Mapas</span>?</span>
                <button onClick={() => setShowBubble(false)} className="hover:bg-muted rounded-full p-1 -mr-2 text-muted-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute -right-3 top-1/2 translate-y-1 w-4 h-4 bg-white dark:bg-zinc-900 rounded-full shadow-sm border border-border/50"></div>
                <div className="absolute -right-7 top-1/2 translate-y-4 w-2 h-2 bg-white dark:bg-zinc-900 rounded-full shadow-sm border border-border/50"></div>
              </div>
            </div>
          )}

          <Button 
            onClick={() => setIsOpen(true)}
            size="lg"
            className="relative rounded-full w-16 h-16 shadow-2xl p-0 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 transition-all duration-300 hover:scale-110 border-2 border-white/20"
          >
            <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-emerald-400" style={{ animationDuration: '3s' }} />
            <Bot className="w-8 h-8 text-white drop-shadow-md relative z-10" />
          </Button>
        </div>
      )}
    </div>
  )
}
