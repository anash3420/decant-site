/** Facebook profile links, including profile.php?id= ones and m.me short links */
export const FACEBOOK_URL = /^(https?:\/\/)?(www\.|m\.|web\.)?(facebook\.com|fb\.com|fb\.me|m\.me)\/.+/i

/** Server-issued inquiry references, e.g. D-7KQ2MX */
export const INQUIRY_REFERENCE = /^D-[A-Z0-9]{5,8}$/
