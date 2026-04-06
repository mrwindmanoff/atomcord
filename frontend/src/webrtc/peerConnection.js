const CONFIGURATION = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function createPeerConnection(socket, targetId, localStream) {
  const pc = new RTCPeerConnection(CONFIGURATION);
  
  // Добавляем локальный аудио поток
  if (localStream) {
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });
  }
  
  // Обработка ICE кандидатов
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('voice-ice-candidate', {
        targetId,
        candidate: event.candidate
      });
    }
  };
  
  // Получение удаленного потока
  pc.ontrack = (event) => {
    const audio = new Audio();
    audio.srcObject = event.streams[0];
    audio.play().catch(e => console.log('Audio play error:', e));
  };
  
  return pc;
}

export async function createOffer(pc, socket, targetId) {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('voice-offer', { targetId, offer });
}

export async function handleOffer(pc, offer, socket, fromId) {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('voice-answer', { targetId: fromId, answer });
}

export async function handleAnswer(pc, answer) {
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

export async function handleIceCandidate(pc, candidate) {
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
}