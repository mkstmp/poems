import React from 'react';

// Tag → emoji map. Order matters: specific entries must come before generic ones.
const TAG_EMOJI_MAP = {
  // Specific animals first (before the generic "animals" catch-all)
  horse: '🐴', 'घोड़े': '🐴', 'घोड़ा': '🐴',
  bird: '🐦', birds: '🐦', chidiya: '🐦', parinda: '🐦', 'परिंदा': '🐦',
  camel: '🐪', oont: '🐪',
  goat: '🐐', goats: '🐐', bakri: '🐐',
  rooster: '🐓', murga: '🐓',
  cat: '🐱', billi: '🐱',
  dog: '🐶', kutta: '🐶',
  elephant: '🐘', haathi: '🐘',
  cow: '🐄', gaay: '🐄',
  fish: '🐟', machhli: '🐟',
  butterfly: '🦋', titli: '🦋',
  // Generic animal fallback
  animals: '🐾', janwar: '🐾',

  // Nature
  moon: '🌙', chanda: '🌙', 'चाँद': '🌙', 'चंदा': '🌙',
  sun: '☀️', surya: '☀️',
  rain: '🌧️', baarish: '🌧️',
  flower: '🌺', phool: '🌺',
  tree: '🌳', jungle: '🌴',
  star: '⭐', sitara: '⭐',
  sea: '🌊', samudra: '🌊',
  water: '💧',
  nature: '🍃',
  plants: '🌱', sugarcane: '🎋', eekh: '🎋',
  tamarind: '🍂', imli: '🍂',

  // Family
  grandparents: '👴', dada: '👴', nana: '👴',
  mother: '👩', maa: '👩', mata: '👩',
  father: '👨', papa: '👨',
  family: '👨‍👩‍👧',
  children: '👶', child: '🧒', bacha: '🧒',
  friend: '🤝',

  // Education & knowledge
  alphabet: '🔤', akshar: '🔤', 'अक्षर': '🔤',
  school: '🏫',
  book: '📖', books: '📖',
  'body parts': '✋', hands: '✋', haath: '✋',
  counting: '🔢', math: '🔢',

  // Food
  food: '🍱', roti: '🫓', khana: '🍱', fruit: '🍎',

  // Activities
  swing: '🎡', jhula: '🎡', jhulam: '🎡', 'झूल': '🎡',
  train: '🚂', gaddi: '🚂',
  play: '🎮', game: '🎯', games: '🎯',
  dance: '💃',
  singing: '🎵', song: '🎵', gana: '🎵',
  sleep: '😴',

  // Moods & concepts
  funny: '😄', humor: '😄',
  riddle: '🔍', paheli: '🔍',
  rhyme: '🎶',
  'tongue-twister': '👅',
  gratitude: '🙏',
  sharing: '🤲',
  motivation: '💪',
  imagination: '💭',
  lock: '🔒',
  world: '🌍', duniya: '🌍',
};

function getSmartEmoji(poem) {
  const tags = poem.tags || [];

  // Step 1: check tags as exact whole-word matches (most reliable)
  for (const tag of tags) {
    const key = tag.toLowerCase().trim();
    if (TAG_EMOJI_MAP[key]) return TAG_EMOJI_MAP[key];
  }

  // Step 2: check individual words in title (NOT substrings — avoids "cat" in "education")
  const titleWords = (poem.title || '').toLowerCase().split(/[\s,।॥?!;:]+/);
  for (const word of titleWords) {
    if (word && TAG_EMOJI_MAP[word]) return TAG_EMOJI_MAP[word];
  }

  // Step 3: check individual words in the summary
  const summaryWords = (poem.shortSummary || '').toLowerCase().split(/[\s,।॥?!;:]+/);
  for (const word of summaryWords) {
    if (word && TAG_EMOJI_MAP[word]) return TAG_EMOJI_MAP[word];
  }

  return '📜';
}

function PoemCard({ poem, onClick, index = 0 }) {
  const emoji = getSmartEmoji(poem);
  const color = poem.uiColor || 'var(--color-primary)';
  const previewLines = poem.text?.split('\n').filter(l => l.trim()).slice(0, 3).join('\n');

  return (
    <div className="poem-card" onClick={onClick} style={{ '--card-color': color }}>
      <div className="poem-card-accent" />

      {/* Header: emoji | title+writer | lang+grade badges */}
      <div className="poem-card-header">
        <span className="poem-card-emoji">{emoji}</span>
        <div className="poem-card-title-block">
          <h3 className="poem-card-title">{poem.title}</h3>
          <p className="poem-card-writer">{poem.writer}</p>
        </div>
        <div className="poem-card-right-badges">
          <span className="badge badge-sm badge-lang">{poem.language}</span>
          {poem.education?.grade && (
            <span className="badge badge-sm badge-edu">{poem.education.grade}</span>
          )}
        </div>
      </div>

      {/* Preview text with fade on 3rd line */}
      <div className="poem-card-preview-wrap">
        <p className="poem-card-preview">{previewLines}</p>
        <div className="poem-card-fade" />
      </div>

      {/* Footer: tags + read link */}
      <div className="poem-card-footer">
        <div className="poem-card-tags">
          {poem.tags?.slice(0, 2).map(tag => (
            <span key={tag} className="tag tag-sm">#{tag}</span>
          ))}
        </div>
        <span className="poem-card-read">Read →</span>
      </div>
    </div>
  );
}

export default PoemCard;
