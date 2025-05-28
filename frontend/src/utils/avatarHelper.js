/**
 * Get avatar image based on username first letter
 * @param {string} username - The username to get avatar for
 * @returns {string} - The avatar image URL
 */
export function getAvatarImage(username) {
  if (!username || typeof username !== 'string') {
    return '/avatars/gorilla.png'; // Default fallback
  }

  const firstLetter = username.charAt(0).toLowerCase();
  
  // Define the alphabet ranges
  // a-f gets giraffe, g-l gets pinguin, m-r gets wombat, s-z gets gorilla
  if (firstLetter <= 'f') {
    return '/avatars/giraffe.png';
  } else if (firstLetter <= 'l') {
    return '/avatars/pinguin.png';
  } else if (firstLetter <= 'r') {
    return '/avatars/wombat.png';
  } else {
    return '/avatars/gorilla.png';
  }
}

/**
 * Get avatar image with full mapping (extensible schema)
 * @param {string} username - The username to get avatar for
 * @returns {string} - The avatar image URL
 */
export function getAvatarImageExtended(username) {
  if (!username || typeof username !== 'string') {
    return '/avatars/gorilla.png'; // Default fallback
  }

  const firstLetter = username.charAt(0).toLowerCase();
  
  // Extensible mapping - can be easily extended with more animals
  const avatarMapping = {
    'a': '/avatars/giraffe.png',
    'b': '/avatars/giraffe.png', 
    'c': '/avatars/giraffe.png',
    'd': '/avatars/giraffe.png',
    'e': '/avatars/giraffe.png',
    'f': '/avatars/giraffe.png',
    'g': '/avatars/pinguin.png',
    'h': '/avatars/pinguin.png',
    'i': '/avatars/pinguin.png',
    'j': '/avatars/pinguin.png',
    'k': '/avatars/pinguin.png',
    'l': '/avatars/pinguin.png',
    'm': '/avatars/wombat.png',
    'n': '/avatars/wombat.png',
    'o': '/avatars/wombat.png',
    'p': '/avatars/wombat.png',
    'q': '/avatars/wombat.png',
    'r': '/avatars/wombat.png',
    's': '/avatars/gorilla.png',
    't': '/avatars/gorilla.png',
    'u': '/avatars/gorilla.png',
    'v': '/avatars/gorilla.png',
    'w': '/avatars/gorilla.png',
    'x': '/avatars/gorilla.png',
    'y': '/avatars/gorilla.png',
    'z': '/avatars/gorilla.png'
  };

  return avatarMapping[firstLetter] || '/avatars/wombat.png';
}