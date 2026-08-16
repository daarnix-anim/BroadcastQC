/**
 * Broadcast QC - Address, Postal, Metric, Finance & General Abbreviations Whitelist
 * Prevents false positives on common abbreviations (g., ul., d., г., ул., д., руб., тел., etc.)
 */

export const ABBREVIATIONS_WHITELIST = [
  // 1. Russian Address & Postal abbreviations
  "г", "гор", "ул", "д", "дом", "стр", "корп", "к", "кв", "оф", "комн", "ком", "пом", "эт", "под",
  "пр", "просп", "пер", "бул", "б-р", "наб", "пл", "ш", "р-н", "обл", "пос", "п", "дер", "с",

  // 2. Russian Metrics, Units & Quantities
  "руб", "коп", "р", "тыс", "млн", "млрд", "трлн", "шт", "чел", "экз",
  "км", "м", "см", "мм", "га", "кг", "г", "мг", "т", "л", "мл",
  "ч", "мин", "сек", "мс", "гг", "вв",

  // 3. Russian Business, Days & Speech abbreviations
  "т.д", "т.п", "т.е", "т.к", "др", "пр", "см", "напр", "тел", "факс", "моб",
  "пн", "вт", "ср", "чт", "пт", "сб", "вс",
  "ооо", "зао", "оао", "пао", "ао", "ип", "нко", "нпо",
  "инн", "кпп", "огрн", "огрнип", "бик",

  // 4. Latin & Translit Address, Metric, Business abbreviations
  "g", "ul", "d", "str", "apt", "tel", "mob", "fax", "email", "mail",
  "st", "ave", "rd", "blvd", "bldg", "corp", "fl", "rm",
  "hr", "min", "sec", "ms", "am", "pm",
  "mon", "tue", "wed", "thu", "fri", "sat", "sun",
  "etc", "inc", "ltd", "llc", "corp", "co", "vs"
];
