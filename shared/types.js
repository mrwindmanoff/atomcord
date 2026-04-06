/**
 * @typedef {Object} User
 * @property {string} socketId
 * @property {string} nickname
 * @property {string|null} textChannel
 * @property {string|null} voiceChannel
 * @property {boolean} isMuted
 * @property {number} joinedAt
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} channelId
 * @property {string} text
 * @property {string} nickname
 * @property {number} timestamp
 */

/**
 * @typedef {Object} Channel
 * @property {string} id
 * @property {string} name
 * @property {'text'|'voice'} type
 */

export const Types = {}; // JSDoc only