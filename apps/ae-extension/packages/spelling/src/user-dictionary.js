/**
 * User Dictionary and Whitelist Manager for Broadcast QC
 */

export const DEFAULT_MOTION_TERMS = [
  // Adobe & Software (EN & RU)
  'After Effects', 'Premiere Pro', 'Photoshop', 'Illustrator', 'Audition',
  'Cinema 4D', 'Redshift', 'Octane', 'Blender', 'Houdini', 'Figma', 'Unreal Engine',
  'DaVinci Resolve', 'Final Cut', 'Maya', '3ds Max', 'Substance',
  'Афтер', 'Премьер', 'Фотошоп', 'Иллюстратор', 'Блендер', 'Синема',
  
  // Motion & VFX Terminology (EN & RU)
  'Motion', 'Design', 'Render', 'VFX', 'SFX', 'CGI', 'Broadcast', 'Animation',
  'Keyframe', 'Tracker', 'Null', 'Precomp', 'Plugin', 'Extension', 'Script',
  'Typography', 'Overlay', 'Lower Third', 'Title', 'Glitch', 'Preset', 'Footage',
  'Timeline', 'Shape', 'Solid', 'Mask', 'Matte', 'Track Matte',
  
  'моушн', 'моушен', 'дизайн', 'дизайнер', 'рендер', 'рендеринг', 'анимация',
  'плагин', 'плагина', 'плагину', 'плагином', 'плагине', 'плагины', 'плагинов',
  'прекомпоз', 'прекомпоза', 'прекомп', 'таймлайн', 'таймлайна', 'кейфрейм', 'ключ',
  'футаж', 'футажа', 'футажи', 'маска', 'маски', 'шейп', 'шейпы', 'шейповый',
  'солид', 'нулевой', 'трекинг', 'трекер', 'титры', 'лоower third',
  
  // Tech & Formats
  '4K', '8K', 'UHD', 'FullHD', 'HD', '60fps', '30fps', '24fps', '25fps', '50fps', 'FPS',
  'ProRes', 'DNxHD', 'H.264', 'H.265', 'HEVC', 'MP4', 'MOV', 'PNG', 'JPEG', 'EXR', 'TIFF',
  'Alpha', 'RGB', 'RGBA', 'Rec.709', 'sRGB', 'DCI-P3', 'ACES', 'LUT', 'альфа',
  
  // Brands & Social
  'YouTube', 'Telegram', 'Instagram', 'TikTok', 'VK', 'Rutube', 'Vimeo',
  'Ютуб', 'Телеграм', 'Инстаграм', 'ТикТок', 'ВКонтакте', 'Рутуб',
  'Apple', 'Google', 'Nvidia', 'AMD', 'Intel', 'Sony', 'Canon', 'RED', 'Blackmagic',
  'OpenAI', 'Midjourney', 'ChatGPT'
];

export class UserDictionary {
  constructor(customWords = [], storageKey = 'broadcast_qc_user_dict') {
    this.storageKey = storageKey;
    this.words = new Set();
    
    // Загрузка дефолтных терминов
    DEFAULT_MOTION_TERMS.forEach(term => this.add(term));
    
    // Загрузка переданных слов
    if (Array.isArray(customWords)) {
      customWords.forEach(w => this.add(w));
    }
  }

  normalize(word) {
    if (!word || typeof word !== 'string') return '';
    return word.trim();
  }

  add(entry) {
    const cleaned = this.normalize(entry);
    if (!cleaned) return this;

    this.words.add(cleaned);
    this.words.add(cleaned.toLowerCase());

    // Если добавлена фраза ("After Effects"), добавляем и отдельные слова ("After", "Effects")
    if (cleaned.includes(' ')) {
      cleaned.split(/\s+/).forEach(word => {
        if (word.length > 1) {
          this.words.add(word);
          this.words.add(word.toLowerCase());
        }
      });
    }

    return this;
  }

  remove(word) {
    const cleaned = this.normalize(word);
    if (cleaned) {
      this.words.delete(cleaned);
      this.words.delete(cleaned.toLowerCase());
    }
    return this;
  }

  has(word) {
    const cleaned = this.normalize(word);
    if (!cleaned) return false;
    return this.words.has(cleaned) || this.words.has(cleaned.toLowerCase());
  }

  getList() {
    return Array.from(this.words).filter(w => w === this.normalize(w));
  }

  clear() {
    this.words.clear();
    DEFAULT_MOTION_TERMS.forEach(term => this.add(term));
  }

  toJSON() {
    return Array.from(this.words);
  }

  static fromJSON(jsonArray) {
    return new UserDictionary(jsonArray);
  }
}
