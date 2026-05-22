/**
 * Checks if a string contains abusive, vulgar, or profane language.
 * Covers English and Hindi/Hinglish profanities.
 * Uses normalization, character substitution, and spacing checks to catch bypass attempts.
 */
export function hasAbusiveLanguage(text) {
  if (!text || typeof text !== 'string') return false;

  const normalized = text.toLowerCase().trim();

  // 1. Direct match check on normalized text
  const badWords = [
    // English swear words
    'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'bastard', 'slut', 'whore', 'piss', 'dick', 'pussy', 'fag', 'nigger', 'faggot', 'retard',
    
    // Hinglish (English alphabet transliterations of Hindi swear words)
    'chutiya', 'chutiye', 'chutya', 'chutiyap', 'chutiyapa', 'chu',
    'madarchod', 'madarchaud', 'maderchod', 'madarcode', 'madarchot', 'madar', 'madrchod',
    'behenchod', 'behanchod', 'bhenchod', 'bhnchod', 'behnchod', 'behinchod', 'bhanchod', 'bc', 'mc',
    'bhonsdike', 'bhosdike', 'bhosadike', 'bhosdi', 'bhosadi', 'bhosad', 'bhosdikey',
    'bsdk', 'dkbose',
    'gandu', 'gaandu', 'gand', 'gaand', 'gandfat', 'gandfati',
    'saala', 'sala', 'saale', 'sale', 'saali', 'sali',
    'harami', 'harame', 'kamina', 'kamine', 'kameena', 'kameeney',
    'randi', 'randy', 'raand', 'rand',
    'chut', 'choot', 'choote',
    'lund', 'laund', 'laud', 'lauda', 'loda',
    'bhadva', 'bhadve', 'bhadua', 'bhadwa', 'bhadwe',
    'kutta', 'kutiya', 'kutte', 'kutto',
    'muth', 'muthe', 'muthal',
    'chudai', 'chudaye', 'chudwana', 'chudwa', 'chod', 'chodna', 'chodne',
    
    // Devanagari (Hindi Script swear words)
    'चूतिया', 'चूतिये', 'चूतियाप', 'चूतियापा',
    'मादरचोद', 'मदरचोद', 'मादर',
    'बहनचोद', 'बहेनचोद', 'भेनचोद', 'भैनचोद',
    'भोसड़ी', 'भोसड़ीके', 'भोसडी', 'भोसडीके', 'भोसड',
    'गांडू', 'गांड', 'गंडू', 'गांडफटी',
    'साला', 'साले', 'साली',
    'हरामी', 'कमीना', 'कमीने',
    'रंडी', 'रांड',
    'चूत',
    'लंड', 'लोड़ा', 'लौड़ा',
    'भड़वा', 'भड़वे',
    'कुत्ता', 'कुतिया', 'कुत्ते',
    'मुठ', 'मुठल',
    'chod', 'chodna', 'chodne', 'चुदाई'
  ];

  // Remove punctuation/symbols for checking (using unicode property escapes to support Hindi and other scripts)
  const cleanText = normalized
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, '') // Remove punctuation but keep letters, marks, and numbers of all languages
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
    'chutiya', 'madarchod', 'behenchod', 'bhonsdike', 'bsdk', 'gandu', 'randi', 'lund', 'loda', 'madrchod', 'behanchod', 'bhenchod',
    'bhadva', 'bhadwa', 'bhadve', 'bhadwe', 'lauda', 'chut', 'bhosdi', 'kutiya', 'chudai', 'gandfat',
    'चूतिया', 'मादरचोद', 'बहनचोद', 'भोसड़ी', 'भोसड़ीके', 'गांडू', 'गांड', 'रंडी', 'लंड', 'लोड़ा', 'लौड़ा', 'भड़वा', 'भड़वे', 'चुदाई'
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
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, '')
    .replace(/\s/g, '');

  for (const bad of badWordsSubstrings) {
    if (substitutedText.includes(bad)) {
      return true;
    }
  }

  return false;
}
