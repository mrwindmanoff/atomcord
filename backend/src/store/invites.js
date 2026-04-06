// Хранилище инвайтов
const invites = new Map(); // code -> { serverId, maxUses, uses, expiresAt, createdBy }

function generateCode() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
}

export function createInvite(serverId, createdBy, maxUses = 0, expiresInHours = 168) { // 7 дней по умолчанию
  const code = generateCode();
  const invite = {
    serverId,
    code,
    maxUses: maxUses === 0 ? Infinity : maxUses,
    uses: 0,
    expiresAt: Date.now() + (expiresInHours * 60 * 60 * 1000),
    createdBy,
    createdAt: Date.now()
  };
  invites.set(code, invite);
  return { code, inviteUrl: `https://atomcord.onrender.com/invite/${code}` };
}

export function getInvite(code) {
  const invite = invites.get(code);
  if (!invite) return null;
  
  // Проверка срока действия
  if (invite.expiresAt < Date.now()) {
    invites.delete(code);
    return null;
  }
  
  // Проверка лимита использований
  if (invite.uses >= invite.maxUses) {
    invites.delete(code);
    return null;
  }
  
  return invite;
}

export function useInvite(code) {
  const invite = invites.get(code);
  if (!invite) return null;
  
  invite.uses++;
  if (invite.uses >= invite.maxUses) {
    invites.delete(code);
  }
  
  return invite.serverId;
}

export function getUserInvites(userId) {
  const userInvites = [];
  for (const invite of invites.values()) {
    if (invite.createdBy === userId) {
      userInvites.push({
        code: invite.code,
        serverId: invite.serverId,
        uses: invite.uses,
        maxUses: invite.maxUses === Infinity ? '∞' : invite.maxUses,
        expiresAt: invite.expiresAt,
        inviteUrl: `https://atomcord.onrender.com/invite/${invite.code}`
      });
    }
  }
  return userInvites;
}

export function deleteInvite(code, userId) {
  const invite = invites.get(code);
  if (invite && invite.createdBy === userId) {
    invites.delete(code);
    return true;
  }
  return false;
}