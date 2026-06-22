export const DEFAULT_AVATAR_COUNT = 8;

export function getDefaultAvatarIndex(identity = '') {
  const normalizedIdentity = String(identity || 'splitbill-avatar');
  let hash = 0;

  for (let index = 0; index < normalizedIdentity.length; index += 1) {
    hash = (hash * 31 + normalizedIdentity.charCodeAt(index)) % 9973;
  }

  return hash % DEFAULT_AVATAR_COUNT;
}
