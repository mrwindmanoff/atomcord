import { io } from '../server.js';

export const channels = [
  { id: 'general', name: 'Общий', type: 'text' },
  { id: 'random', name: 'Случайный', type: 'text' },
  { id: 'voice-lobby', name: 'Главный штаб', type: 'voice' }
];

export function handleChannels(socket) {
  
  socket.on('get-channels', (callback) => {
    if (callback) callback(channels);
    else socket.emit('channels-list', channels);
  });
  
  socket.on('create-channel', ({ name, type }, callback) => {
    if (!name || name.trim().length < 2) {
      callback({ success: false, error: 'Название слишком короткое' });
      return;
    }
    
    const newChannel = {
      id: `${type}-${Date.now()}`,
      name: name.trim(),
      type: type
    };
    
    channels.push(newChannel);
    io.emit('channel-created', newChannel);
    callback({ success: true, channel: newChannel });
  });
  
  socket.on('delete-channel', ({ channelId }, callback) => {
    const index = channels.findIndex(c => c.id === channelId);
    if (index === -1) {
      callback({ success: false, error: 'Канал не найден' });
      return;
    }
    
    const defaultChannels = ['general', 'random', 'voice-lobby'];
    if (defaultChannels.includes(channels[index].id)) {
      callback({ success: false, error: 'Нельзя удалить стандартный канал' });
      return;
    }
    
    channels.splice(index, 1);
    io.emit('channel-deleted', { channelId });
    callback({ success: true });
  });
}