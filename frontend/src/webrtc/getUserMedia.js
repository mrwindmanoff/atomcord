export async function getUserAudio() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });
    return stream;
  } catch (error) {
    console.error('Ошибка получения доступа к микрофону:', error);
    throw error;
  }
}

export function stopAudioStream(stream) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

export function isAudioSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}