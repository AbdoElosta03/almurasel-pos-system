let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || !window.AudioContext) return null
  try {
    audioContext ??= new window.AudioContext()
    return audioContext
  } catch {
    return null
  }
}

// Call while handling the payment click so Chrome permits sound after the API request finishes.
export function preparePaymentSound(): void {
  const context = getAudioContext()
  if (context?.state === 'suspended') void context.resume()
}

export function playPaymentSuccessSound(): void {
  const context = getAudioContext()
  if (!context) return

  const play = () => {
    const start = context.currentTime + 0.02
    const master = context.createGain()
    master.gain.setValueAtTime(0.8, start)
    master.connect(context.destination)

    const notes = [659.25, 783.99, 1046.5]
    notes.forEach((frequency, index) => {
      const noteStart = start + index * 0.11
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = index === 2 ? 'sine' : 'triangle'
      oscillator.frequency.setValueAtTime(frequency, noteStart)
      gain.gain.setValueAtTime(0.0001, noteStart)
      gain.gain.exponentialRampToValueAtTime(index === 2 ? 0.1 : 0.075, noteStart + 0.018)
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.32)

      oscillator.connect(gain)
      gain.connect(master)
      oscillator.start(noteStart)
      oscillator.stop(noteStart + 0.34)
    })
  }

  if (context.state === 'suspended') {
    void context.resume().then(play).catch(() => undefined)
  } else {
    play()
  }
}
