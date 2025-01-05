export enum Language {
  Auto = "auto",
  EN = "en",
  ZH_CN = "zh-CN",
  AM = "am",
  AR = "ar",
  BG = "bg",
  BN = "bn",
  CA = "ca",
  CS = "cs",
  DA = "da",
  DE = "de",
  EL = "el",
  ES_419 = "es-419",
  ES = "es",
  ET = "et",
  FA = "fa",
  FI = "fi",
  FIL = "fil",
  FR = "fr",
  GU = "gu",
  HE = "he",
  HI = "hi",
  HR = "hr",
  HU = "hu",
  ID = "id",
  IT = "it",
  JA = "ja",
  KN = "kn",
  KO = "ko",
  LT = "lt",
  LV = "lv",
  ML = "ml",
  MR = "mr",
  MS = "ms",
  NL = "nl",
  NO = "no",
  PL = "pl",
  PT_BR = "pt-BR",
  PT_PT = "pt-PT",
  RO = "ro",
  RU = "ru",
  SK = "sk",
  SL = "sl",
  SR = "sr",
  SV = "sv",
  SW = "sw",
  TA = "ta",
  TE = "te",
  TH = "th",
  TR = "tr",
  UK = "uk",
  VI = "vi",
  ZH_TW = "zh-TW",
}

export const languages = Object.values(Language)

export function standardizeLanguage(code: string) {
  let lang = code
  if (["en-AU", "en-GB", "en-US"].includes(code)) {
    lang = Language.EN
  }
  lang = lang.replace("_", "-")
  if (!lang) {
    lang = Language.EN
  }

  if (languages.includes(lang as Language)) {
    return lang as Language
  }

  const [language] = lang.split("-")
  const match = languages.find((l) => l.startsWith(language))
  if (match) {
    return match
  }

  return Language.EN
}

export const rtlLanguages: Language[] = [
  Language.AR, // Arabic
  Language.FA, // Persian
  Language.HE, // Hebrew
]

export function isRTL(lang: Language) {
  return rtlLanguages.includes(lang)
}
