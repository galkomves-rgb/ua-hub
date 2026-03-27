import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
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
import { buildCitySearchText, CITY_DIRECTORY } from "@/lib/city-directory";
import { useI18n } from "@/lib/i18n";
import { fetchCitySuggestions, type CitySuggestion } from "@/lib/location-api";
import { cn } from "@/lib/utils";

type CityPickerProps = {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  countryCode?: string;
};

export default function CityPicker({ value, onValueChange, disabled = false, className, buttonClassName, countryCode }: CityPickerProps) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const selectedCity = useMemo(
    () => CITY_DIRECTORY.find((entry) => entry.name.toLowerCase() === value.trim().toLowerCase()),
    [value],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setDebouncedQuery("");
      return;
    }

    setSearchQuery(value);
    setDebouncedQuery(value.trim());
  }, [open, value]);

  const suggestionsQuery = useQuery({
    queryKey: ["city-suggestions", debouncedQuery, countryCode ?? "", locale],
    queryFn: () => fetchCitySuggestions(debouncedQuery, { limit: 8, countryCode, language: locale }),
    enabled: open && debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const fallbackSuggestions = useMemo(() => {
    const normalized = debouncedQuery.toLowerCase();
    const entries = normalized.length >= 2
      ? CITY_DIRECTORY.filter((entry) => buildCitySearchText(entry).toLowerCase().includes(normalized))
      : CITY_DIRECTORY.slice(0, 8);

    return entries.slice(0, 8).map((entry) => ({
      name: entry.name,
      region: null,
      country: null,
      country_code: countryCode?.toUpperCase() ?? null,
      postal_code: entry.postalCodes[0] ?? null,
      display_name: entry.name,
      latitude: null,
      longitude: null,
    } satisfies CitySuggestion));
  }, [countryCode, debouncedQuery]);

  const visibleSuggestions = suggestionsQuery.data?.length ? suggestionsQuery.data : fallbackSuggestions;

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-auto min-h-12 w-full justify-between rounded-2xl px-4 py-3 text-left text-sm font-normal",
              !value && "text-muted-foreground",
              buttonClassName,
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 opacity-60" />
              <span className="truncate">{selectedCity?.name || value || t("cityPicker.placeholder")}</span>
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder={t("cityPicker.searchPlaceholder")} value={searchQuery} onValueChange={setSearchQuery} />
            <CommandList>
              <CommandEmpty>{suggestionsQuery.isLoading ? t("common.loading") : t("cityPicker.empty")}</CommandEmpty>
              <CommandGroup>
                {visibleSuggestions.map((entry) => (
                  <CommandItem
                    key={`${entry.name}-${entry.region ?? ""}-${entry.country ?? ""}-${entry.postal_code ?? ""}`}
                    value={[entry.name, entry.region ?? "", entry.country ?? "", entry.postal_code ?? ""].join(" ")}
                    onSelect={() => {
                      onValueChange(entry.name);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value.trim().toLowerCase() === entry.name.toLowerCase() ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{entry.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[entry.region, entry.country, entry.postal_code].filter(Boolean).join(" · ") || entry.display_name}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}