export enum Locale {
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

export enum LocaleExtend {
  Auto = "auto",
}

export type Language = Locale | LocaleExtend

export const locales = Object.values(Locale)
export const languages = [LocaleExtend.Auto, ...locales]

export const rtlLanguages: Language[] = [
  Locale.AR, // Arabic
  Locale.FA, // Persian
  Locale.HE, // Hebrew
]

export function isRTL(lang: Language) {
  return rtlLanguages.includes(lang)
}

export function standardizeLocale(code: string) {
  let lang = code.replace("_", "-")
  if (["en-AU", "en-GB", "en-US"].includes(lang)) {
    lang = Locale.EN
  }

  if (locales.includes(lang as Locale)) {
    return lang as Locale
  }

  const [language] = lang.split("-")
  const match = locales.find((l) => l.startsWith(language))
  if (match) {
    return match
  }

  return Locale.EN
}

export enum LocaleName {
  en = "English",
  "zh-CN" = "中文（简体）",
  "zh-TW" = "中文（繁體）",
  it = "italiano",
  es = "español (España)",
  am = "አማርኛ",
  ar = "العربية",
  bg = "български",
  bn = "বাংলা",
  ca = "català",
  cs = "čeština",
  da = "dansk",
  de = "Deutsch",
  el = "Ελληνικά",
  "es-419" = "español (Latinoamérica)",
  et = "eesti",
  fa = "فارسی",
  fi = "suomi",
  fil = "Filipino",
  fr = "français",
  gu = "ગુજરાતી",
  he = "עברית",
  hi = "हिंदी",
  hr = "hrvatski",
  hu = "magyar",
  id = "Indonesia",
  ja = "日本語",
  kn = "ಕನ್ನಡ",
  ko = "한국어",
  lt = "lietuvių",
  lv = "latviešu",
  ml = "മലയാളം",
  mr = "मराठी",
  ms = "Melayu",
  nl = "Nederlands",
  no = "norsk",
  pl = "polski",
  "pt-BR" = "português (Brasil)",
  "pt-PT" = "português (Portugal)",
  ro = "română",
  ru = "русский",
  sk = "slovenčina",
  sl = "slovenščina",
  sr = "српски",
  sv = "svenska",
  sw = "Kiswahili",
  ta = "தமிழ்",
  te = "తెలుగు",
  th = "ไทย",
  tr = "Türkçe",
  uk = "українська",
  vi = "Tiếng Việt",
}
