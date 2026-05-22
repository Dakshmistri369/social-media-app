/**
 * Checks if a string contains abusive, vulgar, or profane language.
 * Covers English and Hindi/Hinglish profanities.
 * Uses normalization, character substitution, and spacing checks to catch bypass attempts.
 */
function hasAbusiveLanguage(text) {
  if (!text || typeof text !== 'string') return false;

  const normalized = text.toLowerCase().trim();

  // 1. Direct match check on normalized text
  const badWords = [
    // English swear words
    'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'bastard', 'slut', 'whore', 'piss', 'dick', 'pussy', 'fag', 'nigger', 'faggot', 'retard',
    // Hindi / Hinglish
    'chutiya', 'madarchod', 'behenchod', 'bhonsdike', 'bsdk', 'gandu', 'saala', 'harami', 'kamina', 'randi', 'chut', 'lund', 'loda', 'madrchod', 'behanchod', 'bhenchod'
  ];

  // Remove punctuation/symbols for checking
  const cleanText = normalized
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ');   // Normalize whitespace

  const words = cleanText.split(/\s+/);
  for (const word of words) {
    if (badWords.includes(word)) {
      return true;
    }
  }

  // 2. Check substring match for text with spaces completely removed (catches "fuckyou", "f u c k", etc.)
  const noSpacesText = cleanText.replace(/\s/g, '');
  const badWordsSubstrings = [
    'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'bastard', 'slut', 'whore', 'dick', 'pussy', 'nigger', 'faggot',
    'chutiya', 'madarchod', 'behenchod', 'bhonsdike', 'bsdk', 'gandu', 'randi', 'lund', 'loda', 'madrchod', 'behanchod', 'bhenchod'
  ];
  for (const bad of badWordsSubstrings) {
    if (noSpacesText.includes(bad)) {
      return true;
    }
  }

  // 3. Substitution checks (e.g. f@ck, sh1t, f3ck, ass-hole)
  const substitutedText = normalized
    .replace(/4/g, 'a')
    .replace(/3/g, 'e')
    .replace(/1/g, 'i')
    .replace(/0/g, 'o')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i')
    .replace(/[^\w\s]/g, '')
    .replace(/\s/g, '');

  for (const bad of badWordsSubstrings) {
    if (substitutedText.includes(bad)) {
      return true;
    }
  }

  return false;
}

module.exports = { hasAbusiveLanguage };
