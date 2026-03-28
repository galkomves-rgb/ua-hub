import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";
import {
  PHONE_COUNTRIES,
  findPhoneCountry,
  formatInternationalPhone,
  getDefaultPhoneCountry,
  getPhoneCountryFlag,
  parseInternationalPhone,
  sanitizePhoneNationalNumber,
} from "@/lib/phone-utils";
import { cn } from "@/lib/utils";

type InternationalPhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  inputClassName?: string;
  placeholder?: string;
};

export default function InternationalPhoneInput({
  value,
  onChange,
  disabled = false,
  className,
  buttonClassName,
  inputClassName,
  placeholder,
}: InternationalPhoneInputProps) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [selectedCountryIso, setSelectedCountryIso] = useState(getDefaultPhoneCountry(locale).isoCode);
  const [nationalNumber, setNationalNumber] = useState("");
  const [isStructuredValue, setIsStructuredValue] = useState(true);

  useEffect(() => {
    const parsed = parseInternationalPhone(value, locale);
    setSelectedCountryIso(parsed.country.isoCode);
    setNationalNumber(parsed.nationalNumber);
    setIsStructuredValue(parsed.isStructured);
  }, [locale, value]);

  const selectedCountry = useMemo(() => findPhoneCountry(selectedCountryIso), [selectedCountryIso]);

  const handleCountrySelect = (isoCode: string) => {
    const nextCountry = findPhoneCountry(isoCode);
    setSelectedCountryIso(nextCountry.isoCode);
    setOpen(false);
    setIsStructuredValue(true);

    if (!nationalNumber.trim()) {
      onChange("");
      return;
    }

    onChange(formatInternationalPhone(nextCountry, nationalNumber));
  };

  const handleNumberChange = (nextValue: string) => {
    if (!nextValue.trim()) {
      setNationalNumber("");
      setIsStructuredValue(true);
      onChange("");
      return;
    }

    if (nextValue.trim().startsWith("+")) {
      const parsed = parseInternationalPhone(nextValue, locale);
      setSelectedCountryIso(parsed.country.isoCode);
      setNationalNumber(parsed.nationalNumber);
      setIsStructuredValue(true);
      onChange(formatInternationalPhone(parsed.country, parsed.nationalNumber));
      return;
    }

    const containsRawContactCharacters = /@|[A-Za-zА-Яа-яІіЇїЄє]/.test(nextValue);
    if (containsRawContactCharacters) {
      setNationalNumber(nextValue);
      setIsStructuredValue(false);
      onChange(nextValue.trimStart());
      return;
    }

    const sanitized = sanitizePhoneNationalNumber(nextValue);
    setNationalNumber(sanitized);
    setIsStructuredValue(true);
    onChange(formatInternationalPhone(selectedCountry, sanitized));
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={t("phoneInput.countryLabel")}
            disabled={disabled}
            className={cn("h-12 min-w-[124px] justify-between rounded-2xl px-3 text-sm font-medium", buttonClassName)}
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">{getPhoneCountryFlag(selectedCountry.isoCode)}</span>
              <span>{selectedCountry.dialCode}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t("phoneInput.searchPlaceholder")} />
            <CommandList>
              <CommandEmpty>{t("phoneInput.empty")}</CommandEmpty>
              <CommandGroup>
                {PHONE_COUNTRIES.map((country) => (
                  <CommandItem
                    key={`${country.isoCode}-${country.dialCode}`}
                    value={`${country.name} ${country.dialCode} ${country.isoCode} ${(country.searchTerms || []).join(" ")}`}
                    onSelect={() => handleCountrySelect(country.isoCode)}
                  >
                    <Check className={cn("mr-2 h-4 w-4", selectedCountry.isoCode === country.isoCode ? "opacity-100" : "opacity-0")} />
                    <span className="mr-2 text-base leading-none">{getPhoneCountryFlag(country.isoCode)}</span>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="truncate">{country.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{country.dialCode}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="relative flex-1">
        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
        <input
          type="tel"
          inputMode="tel"
          value={nationalNumber}
          onChange={(event) => handleNumberChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder ?? t("phoneInput.numberPlaceholder")}
          className={cn(
            "h-12 w-full rounded-2xl border bg-transparent pl-10 pr-4 text-sm outline-none transition-colors",
            isStructuredValue ? "" : "border-amber-400/70",
            inputClassName,
          )}
        />
      </div>
    </div>
  );
}
