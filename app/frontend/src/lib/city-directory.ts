export type CityDirectoryEntry = {
  name: string;
  postalCodes: string[];
  aliases?: string[];
};

export const CITY_DIRECTORY: CityDirectoryEntry[] = [
  { name: "Madrid", postalCodes: ["28", "280", "28001", "28013", "28045"] },
  { name: "Barcelona", postalCodes: ["08", "080", "08001", "08007", "08018"] },
  { name: "Valencia", postalCodes: ["46", "460", "46001", "46015", "46024"] },
  { name: "Alicante", postalCodes: ["03", "030", "03001", "03008", "03016"] },
  { name: "Málaga", postalCodes: ["29", "290", "29001", "29006", "29018"], aliases: ["Malaga"] },
  { name: "Sevilla", postalCodes: ["41", "410", "41001", "41013", "41020"] },
  { name: "Bilbao", postalCodes: ["48", "480", "48001", "48009", "48015"] },
  { name: "Zaragoza", postalCodes: ["50", "500", "50001", "50008", "50018"] },
  { name: "Murcia", postalCodes: ["30", "300", "30001", "30007", "30011"] },
  { name: "Palma", postalCodes: ["07", "070", "07001", "07010", "07015"], aliases: ["Palma de Mallorca"] },
  { name: "Torrevieja", postalCodes: ["0318", "03180", "03181", "03182", "03183"] },
  { name: "Benidorm", postalCodes: ["0350", "03501", "03502", "03503"] },
  { name: "Marbella", postalCodes: ["2960", "29601", "29602", "29603", "29604"] },
  { name: "Granada", postalCodes: ["18", "180", "18001", "18008", "18015"] },
  { name: "Salamanca", postalCodes: ["37", "370", "37001", "37008", "37010"] },
  { name: "Elche", postalCodes: ["032", "03201", "03202", "03203", "03204"], aliases: ["Elx"] },
  { name: "Castellón de la Plana", postalCodes: ["12", "120", "12001", "12004", "12006"], aliases: ["Castellon", "Castellón"] },
  { name: "Tarragona", postalCodes: ["43", "430", "43001", "43005", "43008"] },
  { name: "Girona", postalCodes: ["17", "170", "17001", "17003", "17007"], aliases: ["Gerona"] },
  { name: "Lleida", postalCodes: ["25", "250", "25001", "25005", "25008"], aliases: ["Lerida"] },
  { name: "San Sebastián", postalCodes: ["20", "200", "20001", "20012", "20018"], aliases: ["San Sebastian", "Donostia"] },
  { name: "Vitoria-Gasteiz", postalCodes: ["01", "010", "01001", "01005", "01010"], aliases: ["Vitoria", "Vitoria Gasteiz"] },
  { name: "Pamplona", postalCodes: ["31", "310", "31001", "31008", "31015"], aliases: ["Iruña", "Pamplona-Iruña"] },
  { name: "Santander", postalCodes: ["39", "390", "39001", "39005", "39012"] },
  { name: "Oviedo", postalCodes: ["33", "330", "33001", "33008", "33013"] },
  { name: "Gijón", postalCodes: ["332", "33201", "33204", "33209", "33213"], aliases: ["Gijon"] },
  { name: "A Coruña", postalCodes: ["15", "150", "15001", "15006", "15011"], aliases: ["A Coruna", "La Coruña", "La Coruna"] },
  { name: "Vigo", postalCodes: ["36", "362", "36201", "36205", "36210"] },
  { name: "Valladolid", postalCodes: ["47", "470", "47001", "47008", "47014"] },
  { name: "Toledo", postalCodes: ["45", "450", "45001", "45004", "45007"] },
  { name: "Córdoba", postalCodes: ["14", "140", "14001", "14010", "14014"], aliases: ["Cordoba"] },
  { name: "Cádiz", postalCodes: ["11", "110", "11001", "11008", "11012"], aliases: ["Cadiz"] },
  { name: "Almería", postalCodes: ["04", "040", "04001", "04006", "04009"], aliases: ["Almeria"] },
  { name: "Huelva", postalCodes: ["21", "210", "21001", "21004", "21007"] },
  { name: "León", postalCodes: ["24", "240", "24001", "24005", "24010"], aliases: ["Leon"] },
  { name: "Logroño", postalCodes: ["26", "260", "26001", "26005", "26008"], aliases: ["Logrono"] },
  { name: "Burgos", postalCodes: ["09", "090", "09001", "09005", "09007"] },
];

export function buildCitySearchText(entry: CityDirectoryEntry): string {
  return [entry.name, ...(entry.aliases ?? []), ...entry.postalCodes].join(" ");
}