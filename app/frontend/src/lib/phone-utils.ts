export type PhoneCountry = {
  isoCode: string;
  name: string;
  dialCode: string;
  searchTerms?: string[];
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { isoCode: "UA", name: "Ukraine", dialCode: "+380", searchTerms: ["Україна"] },
  { isoCode: "ES", name: "Spain", dialCode: "+34", searchTerms: ["España", "Іспанія"] },
  { isoCode: "PL", name: "Poland", dialCode: "+48", searchTerms: ["Polska"] },
  { isoCode: "DE", name: "Germany", dialCode: "+49", searchTerms: ["Deutschland"] },
  { isoCode: "FR", name: "France", dialCode: "+33" },
  { isoCode: "IT", name: "Italy", dialCode: "+39", searchTerms: ["Italia"] },
  { isoCode: "PT", name: "Portugal", dialCode: "+351" },
  { isoCode: "GB", name: "United Kingdom", dialCode: "+44", searchTerms: ["UK", "Britain"] },
  { isoCode: "IE", name: "Ireland", dialCode: "+353" },
  { isoCode: "NL", name: "Netherlands", dialCode: "+31" },
  { isoCode: "BE", name: "Belgium", dialCode: "+32" },
  { isoCode: "CH", name: "Switzerland", dialCode: "+41" },
  { isoCode: "AT", name: "Austria", dialCode: "+43" },
  { isoCode: "CZ", name: "Czech Republic", dialCode: "+420", searchTerms: ["Czechia"] },
  { isoCode: "SK", name: "Slovakia", dialCode: "+421" },
  { isoCode: "HU", name: "Hungary", dialCode: "+36" },
  { isoCode: "RO", name: "Romania", dialCode: "+40" },
  { isoCode: "BG", name: "Bulgaria", dialCode: "+359" },
  { isoCode: "GR", name: "Greece", dialCode: "+30" },
  { isoCode: "TR", name: "Turkey", dialCode: "+90", searchTerms: ["Türkiye"] },
  { isoCode: "SE", name: "Sweden", dialCode: "+46" },
  { isoCode: "NO", name: "Norway", dialCode: "+47" },
  { isoCode: "DK", name: "Denmark", dialCode: "+45" },
  { isoCode: "FI", name: "Finland", dialCode: "+358" },
  { isoCode: "EE", name: "Estonia", dialCode: "+372" },
  { isoCode: "LV", name: "Latvia", dialCode: "+371" },
  { isoCode: "LT", name: "Lithuania", dialCode: "+370" },
  { isoCode: "MD", name: "Moldova", dialCode: "+373" },
  { isoCode: "GE", name: "Georgia", dialCode: "+995" },
  { isoCode: "AM", name: "Armenia", dialCode: "+374" },
  { isoCode: "KZ", name: "Kazakhstan", dialCode: "+7" },
  { isoCode: "UZ", name: "Uzbekistan", dialCode: "+998" },
  { isoCode: "IL", name: "Israel", dialCode: "+972" },
  { isoCode: "US", name: "United States", dialCode: "+1", searchTerms: ["USA", "United States of America"] },
  { isoCode: "CA", name: "Canada", dialCode: "+1" },
  { isoCode: "MX", name: "Mexico", dialCode: "+52", searchTerms: ["México"] },
  { isoCode: "AR", name: "Argentina", dialCode: "+54" },
  { isoCode: "CL", name: "Chile", dialCode: "+56" },
  { isoCode: "CO", name: "Colombia", dialCode: "+57" },
  { isoCode: "PE", name: "Peru", dialCode: "+51", searchTerms: ["Perú"] },
  { isoCode: "BR", name: "Brazil", dialCode: "+55", searchTerms: ["Brasil"] },
];

const DEFAULT_PHONE_COUNTRY_BY_LOCALE: Record<string, string> = {
  uk: "UA",
  es: "ES",
  en: "US",
};

const PHONE_COUNTRY_BY_ISO = new Map(PHONE_COUNTRIES.map((country) => [country.isoCode, country]));
const PHONE_COUNTRIES_BY_CODE_LENGTH = [...PHONE_COUNTRIES].sort((left, right) => right.dialCode.length - left.dialCode.length);

function digitsOnly(value: string): string {
  return value.replace(/\D+/g, "");
}

function isStructuredPhoneLike(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (/@/.test(trimmed) || /[A-Za-zА-Яа-яІіЇїЄє]/.test(trimmed)) {
    return false;
  }

  return digitsOnly(trimmed).length >= 5;
}

export function getPhoneCountryFlag(isoCode: string): string {
  return isoCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function getDefaultPhoneCountry(locale?: string): PhoneCountry {
  const isoCode = locale ? DEFAULT_PHONE_COUNTRY_BY_LOCALE[locale] : undefined;
  return (isoCode ? PHONE_COUNTRY_BY_ISO.get(isoCode) : undefined) ?? PHONE_COUNTRY_BY_ISO.get("ES") ?? PHONE_COUNTRIES[0];
}

export function findPhoneCountry(isoCode?: string | null): PhoneCountry {
  return (isoCode ? PHONE_COUNTRY_BY_ISO.get(isoCode.toUpperCase()) : undefined) ?? PHONE_COUNTRIES[0];
}

export function sanitizePhoneNationalNumber(value: string): string {
  return value.replace(/[^\d\s\-().]/g, "").replace(/\s+/g, " ").trimStart();
}

export function formatInternationalPhone(country: PhoneCountry, nationalNumber: string): string {
  const cleanedNationalNumber = sanitizePhoneNationalNumber(nationalNumber).trim();
  if (!cleanedNationalNumber) {
    return "";
  }

  return `${country.dialCode} ${cleanedNationalNumber}`.trim();
}

export function parseInternationalPhone(value: string, locale?: string): { country: PhoneCountry; nationalNumber: string; isStructured: boolean } {
  const trimmed = value.trim();
  const fallbackCountry = getDefaultPhoneCountry(locale);

  if (!trimmed) {
    return { country: fallbackCountry, nationalNumber: "", isStructured: true };
  }

  if (!isStructuredPhoneLike(trimmed)) {
    return { country: fallbackCountry, nationalNumber: trimmed, isStructured: false };
  }

  const compactDigits = digitsOnly(trimmed);
  const normalizedDialValue = trimmed.startsWith("+") ? `+${compactDigits}` : compactDigits;

  if (normalizedDialValue.startsWith("+")) {
    const matchedCountry = PHONE_COUNTRIES_BY_CODE_LENGTH.find((country) => normalizedDialValue.startsWith(country.dialCode));
    if (matchedCountry) {
      const nationalDigits = normalizedDialValue.slice(matchedCountry.dialCode.length);
      return {
        country: matchedCountry,
        nationalNumber: nationalDigits,
        isStructured: true,
      };
    }
  }

  return {
    country: fallbackCountry,
    nationalNumber: sanitizePhoneNationalNumber(trimmed),
    isStructured: true,
  };
}

export function normalizeStoredPhoneValue(value: string, locale?: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const parsed = parseInternationalPhone(trimmed, locale);
  if (!parsed.isStructured) {
    return trimmed;
  }

  return formatInternationalPhone(parsed.country, parsed.nationalNumber) || trimmed;
}
