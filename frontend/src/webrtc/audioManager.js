export class AudioManager {
  constructor() {
    this.context = null;
    this.gainNode = null;
    this.isMuted = false;
  }
  
  init() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.context.createGain();
      this.gainNode.connect(this.context.destination);
      this.gainNode.gain.value = 1;
    }
    return this.context;
  }
  
  setVolume(volume) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
  
  mute() {
    if (this.gainNode) {
      this.gainNode.gain.value = 0;
      this.isMuted = true;
    }
  }
  
  unmute() {
    if (this.gainNode) {
      this.gainNode.gain.value = 1;
      this.isMuted = false;
    }
  }
  
  toggleMute() {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMuted;
  }
  
  close() {
    if (this.context) {
      this.context.close();
      this.context = null;
      this.gainNode = null;
    }
  }
}

export const audioManager = new AudioManager();