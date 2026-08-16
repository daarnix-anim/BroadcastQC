/**
 * Broadcast QC - Russian Morphological Engine
 * Analyzes Russian word forms via productive stem + affix grammar rules.
 * Handles noun declensions (6 cases, singular/plural), adjective agreements,
 * verb conjugations, participles, gerunds, verbal nouns, compound nouns, and productive prefixes.
 */

export class RussianMorphology {
  constructor(dictionarySet = new Set()) {
    this.lexicon = dictionarySet;
  }

  setLexicon(set) {
    this.lexicon = set;
  }

  /**
   * Productive Russian prefixes
   */
  static PREFIXES = [
    'по', 'пере', 'про', 'за', 'до', 'вы', 'на', 'под', 'подо',
    'от', 'ото', 'с', 'со', 'при', 'раз', 'рас', 'разо', 'из', 'ис',
    'изо', 'без', 'бес', 'безо', 'не', 'недо', 'наи', 'сверх',
    'меж', 'со', 'полу', 'де', 'ре', 'супер', 'мега', 'микро', 'мини',
    // Compound prefix bases
    'видео', 'аудио', 'кино', 'теле', 'радио', 'фото', 'медиа', 'веб', 'онлайн', 'офлайн', 'оффлайн', 'мульти'
  ];

  /**
   * Check if a word or any of its valid morphological inflections exist in lexicon
   * @param {string} word - normalized lowercase Russian word (ё -> е)
   * @returns {boolean}
   */
  isValid(word) {
    if (!word || typeof word !== 'string') return false;
    if (word.length <= 1) return this.lexicon.has(word);

    // 1. Direct match in dictionary
    if (this.lexicon.has(word)) return true;

    // 2. Morphological stem stripping & derivation
    const stems = this.extractPossibleStems(word);
    for (const stem of stems) {
      if (this.lexicon.has(stem)) return true;
    }

    // 3. Prefix & compound prefix stripping + recursive stem lookup
    for (const prefix of RussianMorphology.PREFIXES) {
      if (word.startsWith(prefix) && word.length - prefix.length >= 3) {
        const rootPart = word.slice(prefix.length);
        if (this.lexicon.has(rootPart)) return true;

        const subStems = this.extractPossibleStems(rootPart);
        for (const s of subStems) {
          if (this.lexicon.has(s)) return true;
        }
      }
    }

    return false;
  }

  /**
   * Generates possible base dictionary lemmas/stems from an inflected word form
   */
  extractPossibleStems(word) {
    const candidates = new Set();
    const len = word.length;
    if (len < 3) return candidates;

    let base = word;

    // Reflexive verb suffix removal (-ся, -сь, -тесь)
    if (base.endsWith('тесь')) {
      const stem = base.slice(0, -4);
      candidates.add(stem + 'ться');
      candidates.add(stem + 'аться');
      candidates.add(stem + 'иться');
      candidates.add(stem + 'еться');
      candidates.add(stem + 'уться');
      candidates.add(stem + 'вать');
      candidates.add(stem + 'ваться');
      candidates.add(stem + 'ать');
      candidates.add(stem + 'ить');
      base = stem + 'те';
    } else if (base.endsWith('ся') || base.endsWith('сь')) {
      const stem = base.slice(0, -2);
      candidates.add(stem);
      candidates.add(stem + 'ть');
      candidates.add(stem + 'ться');
      candidates.add(stem + 'ать');
      candidates.add(stem + 'аться');
      candidates.add(stem + 'ить');
      candidates.add(stem + 'иться');
      base = stem;
    }

    // Verbal Noun Endings: -ание, -ение, -яние, -ие
    const verbalNounMatch = base.match(/^(.+?)(ание|ение|яние|ания|ения|яния|анию|ению|янию|анием|ением|янием|ании|ении|янии|аний|ений|яний|аниях|ениях|яниях|аниям|ениям|яниям|аниями|ениями|яниями)$/);
    if (verbalNounMatch) {
      const vStem = verbalNounMatch[1];
      candidates.add(vStem + 'ать');
      candidates.add(vStem + 'ить');
      candidates.add(vStem + 'еть');
      candidates.add(vStem + 'ять');
      candidates.add(vStem + 'овать');
      candidates.add(vStem + 'ание');
      candidates.add(vStem + 'ение');
      candidates.add(vStem + 'ть');
    }

    // A. Participle forms with active/passive suffixes (-ующий, -ящий, -ащий, -вший, -нный, -тый)
    const participleMatch = base.match(/^(.+?)(ующего|ующему|ующим|ующем|ующая|ующую|ующей|ующие|ующих|ующими|ующий|ющего|ющему|ющим|ющем|ющая|ющую|ющей|ющие|ющих|ющими|ющий|ящего|ящему|ящим|ящем|ящая|ящую|ящей|ящие|ящих|ящими|ящий|ащего|ащему|ащим|ащем|ащая|ащую|ащей|ащие|ащих|ащими|ащий|вшего|вшему|вшим|вшем|вшая|вшую|вшей|вшие|вших|вшими|вший|нного|нному|нным|нном|нная|нную|нной|нные|нных|нными|нный|тый|того|тому|тым|том|тая|тую|той|тые|тых|тыми)$/);
    if (participleMatch) {
      const pStem = participleMatch[1];
      candidates.add(pStem);
      candidates.add(pStem + 'ть');
      candidates.add(pStem + 'ать');
      candidates.add(pStem + 'ить');
      candidates.add(pStem + 'еть');
      candidates.add(pStem + 'овать');
      candidates.add(pStem + 'евать');
      candidates.add(pStem + 'вать');
      candidates.add(pStem + 'ся');
      candidates.add(pStem + 'ться');
      candidates.add(pStem + 'аться');
      candidates.add(pStem + 'иться');
    }

    // B. Adjective Endings -> Base form (-ый, -ий, -ой)
    const adjEndings = [
      'ого', 'его', 'ому', 'ему', 'ым', 'им', 'ом', 'ем',
      'ая', 'яя', 'ой', 'ей', 'ую', 'юю', 'ою', 'ею',
      'ое', 'ее',
      'ые', 'ие', 'ых', 'их', 'ыми', 'ими'
    ];
    for (const end of adjEndings) {
      if (base.endsWith(end) && base.length - end.length >= 2) {
        const stem = base.slice(0, -end.length);
        candidates.add(stem + 'ый');
        candidates.add(stem + 'ий');
        candidates.add(stem + 'ой');
        candidates.add(stem); // Short form or noun stem
      }
    }

    // Short adjective & adverb endings (-о, -е, -ен, -на, -но, -ны)
    if (base.endsWith('о') || base.endsWith('е')) {
      const stem = base.slice(0, -1);
      candidates.add(stem + 'ый');
      candidates.add(stem + 'ий');
      candidates.add(stem + 'ой');
      candidates.add(stem);
    }

    // C. Noun Declensions (1st, 2nd, 3rd) -> Base form (Nom. Sing)
    const nounEndings = [
      'ами', 'ями', 'ьми', 'ов', 'ев', 'ей', 'ам', 'ям', 'ах', 'ях',
      'ом', 'ем', 'ей', 'ой', 'ею', 'ою', 'ью',
      'ы', 'и', 'а', 'я', 'у', 'ю', 'е', 'о', 'ь'
    ];
    for (const end of nounEndings) {
      if (base.endsWith(end) && base.length - end.length >= 2) {
        const stem = base.slice(0, -end.length);
        candidates.add(stem);        // Masc zero-ending: стол, кадр, рендер, макет, ролик
        candidates.add(stem + 'й');   // Masc -й: слой, край, музей, случай, трамвай, герой, сарай
        candidates.add(stem + 'а');   // Fem -а: программа, композиция, маска
        candidates.add(stem + 'я');   // Fem -я: студия, серия, линия
        candidates.add(stem + 'о');   // Neut -о: видео, окно, решение
        candidates.add(stem + 'е');   // Neut -е: поле, здание
        candidates.add(stem + 'ь');   // Soft sign: контроль, уровень, скорость
        candidates.add(stem + 'ие');  // Verbal noun: создание, вещание, движение
        candidates.add(stem + 'ка');  // Diminutive: плашка, заставка, отбивка
      }
    }

    // Abstract & verbal noun suffixes: -изация, -ирование, -ение, -ание, -ость
    if (base.endsWith('ием') || base.endsWith('ию') || base.endsWith('ия') || base.endsWith('ии') || base.endsWith('ий') || base.endsWith('иях') || base.endsWith('ие')) {
      const stem = base.replace(/(ием|ию|ия|ии|ий|иях|иям|иями|ие)$/, '');
      candidates.add(stem + 'ие');
      candidates.add(stem + 'ить');
      candidates.add(stem + 'ать');
      candidates.add(stem + 'дать');
    }

    // D. Verb Conjugations & Tenses -> Infinitive (-ать, -ить, -еть, -овать, -нуть)
    const verbEndings = [
      'аешься', 'яешься', 'ишься', 'ешься', 'етесь', 'итесь', 'аетесь', 'яетесь',
      'ается', 'яется', 'ится', 'ется', 'аемся', 'яемся', 'имся', 'емся',
      'аются', 'яются', 'ятся', 'утся', 'ются', 'атся',
      'аешь', 'яешь', 'ишь', 'ешь', 'ете', 'ите', 'аете', 'яете',
      'ает', 'яет', 'ит', 'ет', 'аем', 'яем', 'им', 'ем',
      'ают', 'яют', 'ят', 'ут', 'ют', 'ат',
      'аю', 'яю', 'ую', 'ю', 'у',
      'ал', 'ала', 'ало', 'али', 'ил', 'ила', 'ило', 'или', 'ел', 'ела', 'ело', 'ели', 'ну', 'нул', 'нула', 'нули',
      'ай', 'айте', 'уй', 'уйте', 'ий', 'ийте', 'ите', 'ьте', 'те',
      'ая', 'яя', 'ив', 'ав', 'ивши', 'авши',
      'ающий', 'яющий', 'ующий', 'ущий', 'ющий', 'ящий', 'авший', 'ивший', 'евший', 'анный', 'енный'
    ];

    for (const vEnd of verbEndings) {
      if (base.endsWith(vEnd) && base.length - vEnd.length >= 2) {
        const stem = base.slice(0, -vEnd.length);
        candidates.add(stem);
        candidates.add(stem + 'ть');
        candidates.add(stem + 'ться');
        candidates.add(stem + 'ать');
        candidates.add(stem + 'аться');
        candidates.add(stem + 'ить');
        candidates.add(stem + 'иться');
        candidates.add(stem + 'еть');
        candidates.add(stem + 'еться');
        candidates.add(stem + 'ять');
        candidates.add(stem + 'уть');
        candidates.add(stem + 'овать');
        candidates.add(stem + 'оваться');
        candidates.add(stem + 'евать');
        candidates.add(stem + 'еваться');
        candidates.add(stem + 'нуть');
        candidates.add(stem + 'ти');
        candidates.add(stem + 'чь');
      }
    }

    // Fleeting vowels (беглые гласные: ролик -> ролика, подарок -> подарка, кадр -> кадры)
    if (base.includes('к') || base.includes('ц') || base.includes('н')) {
      const match = base.match(/^(.+?)(ок|ек|ец|ень|ел)$/);
      if (match) {
        candidates.add(match[1] + 'к');
        candidates.add(match[1] + 'ц');
        candidates.add(match[1] + 'нь');
      }
    }

    return candidates;
  }
}
