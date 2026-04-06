// Константы событий для Socket.IO
export const EVENTS = {
  // Клиент -> Сервер
  REGISTER: 'register',
  SEND_MESSAGE: 'send-message',
  JOIN_TEXT_CHANNEL: 'join-text-channel',
  JOIN_VOICE: 'join-voice',
  LEAVE_VOICE: 'leave-voice',
  VOICE_OFFER: 'voice-offer',
  VOICE_ANSWER: 'voice-answer',
  VOICE_ICE_CANDIDATE: 'voice-ice-candidate',
  
  // Сервер -> Клиент
  REGISTERED: 'registered',
  NEW_MESSAGE: 'new-message',
  CHANNEL_HISTORY: 'channel-history',
  USERS_LIST: 'users-list',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  VOICE_USERS: 'voice-users',
  USER_JOINED_VOICE: 'user-joined-voice',
  USER_LEFT_VOICE: 'user-left-voice',
  ERROR: 'error'
};

export const CHANNELS = {
  TEXT: {
    GENERAL: 'general',
    RANDOM: 'random',
    ANNOUNCEMENTS: 'announcements'
  },
  VOICE: {
    LOBBY: 'voice-lobby',
    GAMING: 'voice-gaming',
    MEETING: 'voice-meeting'
  }
};

export const CONSTANTS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_NICKNAME_LENGTH: 32,
  MIN_NICKNAME_LENGTH: 2,
  MESSAGE_HISTORY_LIMIT: 50
};