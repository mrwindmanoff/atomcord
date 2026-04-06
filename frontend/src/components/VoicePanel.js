export const VoicePanel = {
  render(container, channel, socket) {
    if (channel.type !== 'voice') {
      container.innerHTML = '';
      return;
    }
    
    let localStream = null;
    let isConnected = false;
    let peerConnections = new Map();
    let reconnectInterval = null;
    let voiceUsers = [];
    
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceTransportPolicy: 'all',
      rtcpMuxPolicy: 'require'
    };
    
    // Оптимизированные настройки для плавного звука
    const audioConstraints = {
      audio: {
        echoCancellation: false,        // Отключаем эхоподавление
        noiseSuppression: false,        // Отключаем шумоподавление
        autoGainControl: false,         // Отключаем автогромкость
        sampleRate: 48000,              // Максимальное качество
        sampleSize: 16,
        channelCount: 1
      }
    };
    
    async function createPeerConnection(targetId) {
      if (peerConnections.has(targetId)) {
        const existing = peerConnections.get(targetId);
        if (existing.pc.connectionState === 'connected') {
          return existing;
        }
        existing.pc.close();
        peerConnections.delete(targetId);
      }
      
      const pc = new RTCPeerConnection(configuration);
      let gainNode = null;
      let audioContext = null;
      
      // Добавляем локальный аудио поток с чистыми настройками
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }
      
      pc.ontrack = (event) => {
        // Создаём аудио элемент без дополнительной обработки
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
        audio.volume = 1.0;
        
        // Убираем задержку
        audio.play().catch(e => console.log('Audio error:', e));
        
        // Сохраняем для регулировки громкости
        const connection = peerConnections.get(targetId);
        if (connection) {
          connection.audioElement = audio;
        }
      };
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('voice-ice-candidate', {
            targetId: targetId,
            candidate: event.candidate
          });
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected') {
          console.log(`✅ P2P соединение с ${targetId}`);
        }
        if (pc.iceConnectionState === 'failed') {
          setTimeout(() => {
            if (isConnected && peerConnections.has(targetId)) {
              peerConnections.delete(targetId);
              createPeerConnection(targetId);
            }
          }, 1000);
        }
      };
      
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);
      
      socket.emit('voice-offer', { targetId: targetId, offer });
      
      peerConnections.set(targetId, { pc, gainNode });
      return { pc };
    }
    
    // Регулировка громкости
    function setUserVolume(targetId, volume) {
      const connection = peerConnections.get(targetId);
      if (connection && connection.audioElement) {
        connection.audioElement.volume = Math.max(0, Math.min(2, volume));
      }
    }
    
    async function handleOffer(fromId, offer) {
      if (peerConnections.has(fromId)) {
        const existing = peerConnections.get(fromId);
        if (existing.pc.connectionState === 'connected') return;
        existing.pc.close();
        peerConnections.delete(fromId);
      }
      
      const pc = new RTCPeerConnection(configuration);
      
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }
      
      pc.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
        audio.volume = 1.0;
        audio.play().catch(e => console.log('Audio error:', e));
        
        const connection = peerConnections.get(fromId);
        if (connection) {
          connection.audioElement = audio;
        }
      };
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('voice-ice-candidate', {
            targetId: fromId,
            candidate: event.candidate
          });
        }
      };
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit('voice-answer', { targetId: fromId, answer });
      
      peerConnections.set(fromId, { pc });
    }
    
    async function handleAnswer(fromId, answer) {
      const connection = peerConnections.get(fromId);
      if (connection) {
        await connection.pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    }
    
    async function handleIceCandidate(fromId, candidate) {
      const connection = peerConnections.get(fromId);
      if (connection) {
        await connection.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }
    
    function updateVoiceUsersUI() {
      const container = document.getElementById('voice-users-container');
      if (!container) return;
      
      if (voiceUsers.length === 0) {
        container.innerHTML = `
          <div class="voice-users-header">В КАНАЛЕ — 0</div>
          <div class="voice-users-empty">Никого в голосовом канале</div>
        `;
        return;
      }
      
      container.innerHTML = `
        <div class="voice-users-header">В КАНАЛЕ — ${voiceUsers.length}</div>
        <div class="voice-users-list">
          ${voiceUsers.map(user => `
            <div class="voice-user" data-user-id="${user.socketId}">
              <div class="voice-user-info">
                <span class="voice-user-status"></span>
                <span class="voice-user-name">${escapeHtml(user.nickname)}</span>
                ${user.socketId === socket.id ? '<span class="voice-user-badge">(Вы)</span>' : ''}
              </div>
              ${user.socketId !== socket.id ? `
                <div class="voice-user-volume">
                  <input type="range" class="volume-slider" min="0" max="200" value="100" data-target="${user.socketId}">
                  <span class="volume-value">100%</span>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
      
      document.querySelectorAll('.volume-slider').forEach(slider => {
        const targetId = slider.dataset.target;
        const valueSpan = slider.parentElement.querySelector('.volume-value');
        
        slider.addEventListener('input', (e) => {
          const val = parseInt(e.target.value);
          const volume = val / 100;
          valueSpan.textContent = `${val}%`;
          setUserVolume(targetId, volume);
        });
      });
    }
    
    function startKeepAlive() {
      if (reconnectInterval) clearInterval(reconnectInterval);
      reconnectInterval = setInterval(() => {
        if (isConnected && socket) {
          socket.emit('voice-ping', { channelId: channel.id });
        }
      }, 5000);
    }
    
    function stopKeepAlive() {
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
    }
    
    async function connectVoice() {
      try {
        // Чистый захват микрофона без обработки
        const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
        localStream = stream;
        
        socket.emit('join-voice', { channelId: channel.id }, (response) => {
          if (response && response.success) {
            isConnected = true;
            startKeepAlive();
            updateUI();
          }
        });
        
      } catch (err) {
        console.error('Microphone error:', err);
        alert('Не удалось получить доступ к микрофону');
      }
    }
    
    function disconnectVoice() {
      stopKeepAlive();
      
      socket.emit('leave-voice', { channelId: channel.id });
      
      peerConnections.forEach((connection) => {
        if (connection.pc) connection.pc.close();
        if (connection.audioElement) connection.audioElement = null;
      });
      peerConnections.clear();
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
      }
      
      voiceUsers = [];
      isConnected = false;
      updateVoiceUsersUI();
      updateUI();
    }
    
    function updateUI() {
      const btn = document.getElementById('voice-connect-btn');
      const status = document.getElementById('voice-status');
      const usersContainer = document.getElementById('voice-users-container');
      
      if (btn) {
        if (isConnected) {
          btn.textContent = '🔴 Отключиться';
          btn.classList.add('leave');
          if (status) {
            status.textContent = '✅ В голосе';
            status.style.color = '#3ba55d';
          }
          if (usersContainer) usersContainer.style.display = 'block';
        } else {
          btn.textContent = '🎤 Подключиться';
          btn.classList.remove('leave');
          if (status) {
            status.textContent = '❌ Не в голосе';
            status.style.color = '#888';
          }
          if (usersContainer) usersContainer.style.display = 'none';
        }
      }
    }
    
    function setupSocketHandlers() {
      socket.off('user-joined-voice');
      socket.off('user-left-voice');
      socket.off('voice-offer');
      socket.off('voice-answer');
      socket.off('voice-ice-candidate');
      socket.off('voice-users');
      socket.off('voice-pong');
      
      socket.on('user-joined-voice', ({ socketId, nickname }) => {
        if (isConnected && socketId !== socket.id) {
          voiceUsers.push({ socketId, nickname });
          updateVoiceUsersUI();
          createPeerConnection(socketId);
        }
      });
      
      socket.on('user-left-voice', ({ socketId }) => {
        voiceUsers = voiceUsers.filter(u => u.socketId !== socketId);
        updateVoiceUsersUI();
        
        const connection = peerConnections.get(socketId);
        if (connection) {
          connection.pc.close();
          peerConnections.delete(socketId);
        }
      });
      
      socket.on('voice-offer', async ({ fromId, offer }) => {
        if (isConnected && fromId !== socket.id) {
          await handleOffer(fromId, offer);
        }
      });
      
      socket.on('voice-answer', async ({ fromId, answer }) => {
        if (isConnected) {
          await handleAnswer(fromId, answer);
        }
      });
      
      socket.on('voice-ice-candidate', async ({ fromId, candidate }) => {
        if (isConnected) {
          await handleIceCandidate(fromId, candidate);
        }
      });
      
      socket.on('voice-users', (users) => {
        voiceUsers = users;
        updateVoiceUsersUI();
        
        if (isConnected) {
          users.forEach(user => {
            if (user.socketId !== socket.id && !peerConnections.has(user.socketId)) {
              createPeerConnection(user.socketId);
            }
          });
        }
      });
      
      socket.on('voice-pong', () => {});
    }
    
    container.innerHTML = `
      <div class="voice-panel">
        <div class="voice-panel-header">
          <div class="voice-info">
            <span>🎙️ ${channel.name}</span>
            <span id="voice-status" class="voice-status">❌ Не в голосе</span>
          </div>
          <button id="voice-connect-btn" class="voice-button">🎤 Подключиться</button>
        </div>
        <div id="voice-users-container" class="voice-users-container" style="display: none;">
          <div class="voice-users-header">В КАНАЛЕ — 0</div>
          <div class="voice-users-empty">Никого в голосовом канале</div>
        </div>
      </div>
    `;
    
    setupSocketHandlers();
    
    const btn = document.getElementById('voice-connect-btn');
    btn.addEventListener('click', () => {
      if (isConnected) {
        disconnectVoice();
      } else {
        connectVoice();
      }
    });
  }
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}