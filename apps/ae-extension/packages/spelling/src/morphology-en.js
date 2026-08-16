/**
 * Broadcast QC - English Morphological Engine
 * Analyzes English word forms via stem and affix rules:
 * plurals (-s, -es, -ies), verb tenses (-ed, -ing), adverbs (-ly),
 * comparatives (-er, -est), and productive prefixes (un-, re-, pre-, multi-, etc.)
 */

export class EnglishMorphology {
  constructor(dictionarySet = new Set()) {
    this.lexicon = dictionarySet;
  }

  setLexicon(set) {
    this.lexicon = set;
  }

  static PREFIXES = [
    'un', 're', 'pre', 'post', 'non', 'dis', 'in', 'im', 'il', 'ir',
    'anti', 'auto', 'sub', 'inter', 'co', 'trans', 'over', 'under',
    'multi', 'mega', 'micro', 'mini', 'super', 'hyper', 'semi', 'mid'
  ];

  isValid(word) {
    if (!word || typeof word !== 'string') return false;
    if (word.length <= 1) return this.lexicon.has(word);

    // 1. Direct dictionary match
    if (this.lexicon.has(word)) return true;

    // 2. Stem derivation
    const stems = this.extractPossibleStems(word);
    for (const stem of stems) {
      if (this.lexicon.has(stem)) return true;
    }

    // 3. Prefix stripping
    for (const prefix of EnglishMorphology.PREFIXES) {
      if (word.startsWith(prefix) && word.length - prefix.length >= 3) {
        const root = word.slice(prefix.length);
        if (this.lexicon.has(root)) return true;

        const subStems = this.extractPossibleStems(root);
        for (const s of subStems) {
          if (this.lexicon.has(s)) return true;
        }
      }
    }

    return false;
  }

  extractPossibleStems(word) {
    const candidates = new Set();
    const len = word.length;
    if (len < 3) return candidates;

    // Plurals & 3rd person singular (-s, -es, -ies)
    if (word.endsWith('ies') && len > 4) {
      candidates.add(word.slice(0, -3) + 'y'); // categories -> category
    }
    if (word.endsWith('es') && len > 3) {
      candidates.add(word.slice(0, -2));     // watches -> watch, boxes -> box
      candidates.add(word.slice(0, -1));     // guides -> guide
    }
    if (word.endsWith('s') && !word.endsWith('ss') && len > 2) {
      candidates.add(word.slice(0, -1));     // layers -> layer, frames -> frame
    }

    // Past tense & participle (-ed, -ied)
    if (word.endsWith('ied') && len > 4) {
      candidates.add(word.slice(0, -3) + 'y'); // applied -> apply
    }
    if (word.endsWith('ed') && len > 3) {
      candidates.add(word.slice(0, -2));       // rendered -> render, tracked -> track
      candidates.add(word.slice(0, -1));       // animated -> animate, resized -> resize
      candidates.add(word.slice(0, -2) + 'e'); // animated -> animate
      // Double consonant stripping: cropped -> crop, dropped -> drop
      const stripped = word.slice(0, -2);
      if (stripped.length >= 3 && stripped[stripped.length - 1] === stripped[stripped.length - 2]) {
        candidates.add(stripped.slice(0, -1));
      }
    }

    // Progressive / Gerund (-ing, -ying)
    if (word.endsWith('ying') && len > 5) {
      candidates.add(word.slice(0, -4) + 'ie'); // dying -> die
      candidates.add(word.slice(0, -4) + 'y');  // applying -> apply
    }
    if (word.endsWith('ing') && len > 4) {
      const stem = word.slice(0, -3);
      candidates.add(stem);        // rendering -> render
      candidates.add(stem + 'e');   // animating -> animate, scaling -> scale
      candidates.add(stem + 'ion'); // animating -> animation
      // Double consonant stripping: clipping -> clip
      if (stem.length >= 3 && stem[stem.length - 1] === stem[stem.length - 2]) {
        candidates.add(stem.slice(0, -1));
      }
    }

    // Adverbs (-ly, -ally)
    if (word.endsWith('ally') && len > 5) {
      candidates.add(word.slice(0, -4) + 'ic'); // automatically -> automatic
    }
    if (word.endsWith('ily') && len > 4) {
      candidates.add(word.slice(0, -3) + 'y');  // easily -> easy
    }
    if (word.endsWith('ly') && len > 3) {
      candidates.add(word.slice(0, -2));       // smoothly -> smooth, quickly -> quick
      candidates.add(word.slice(0, -2) + 'e');  // nicely -> nice
    }

    // Comparative & Superlative (-er, -est)
    if (word.endsWith('est') && len > 4) {
      candidates.add(word.slice(0, -3));       // fastest -> fast
      candidates.add(word.slice(0, -2));       // widest -> wide
    }
    if (word.endsWith('er') && len > 3) {
      candidates.add(word.slice(0, -2));       // faster -> fast
      candidates.add(word.slice(0, -1));       // wider -> wide
    }

    // Noun/Adjective derivational suffixes: -able, -ible, -ness, -ment, -tion, -sion, -ize, -ise, -ful, -less
    if (word.endsWith('ness') && len > 5) candidates.add(word.slice(0, -4));
    if (word.endsWith('ment') && len > 5) candidates.add(word.slice(0, -4));
    if (word.endsWith('able') && len > 5) {
      candidates.add(word.slice(0, -4));
      candidates.add(word.slice(0, -4) + 'e');
    }
    if (word.endsWith('tion') && len > 5) {
      candidates.add(word.slice(0, -4) + 'te'); // animation -> animate
      candidates.add(word.slice(0, -4) + 't');
      candidates.add(word.slice(0, -4));
    }
    if (word.endsWith('less') && len > 5) candidates.add(word.slice(0, -4));
    if (word.endsWith('ful') && len > 4) candidates.add(word.slice(0, -3));

    return candidates;
  }
}
