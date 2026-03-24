import { Home, MapPin, Euro, Maximize } from "lucide-react";
import CategoryLayout from "@/components/CategoryLayout";

const sampleListings = [
  {
    title: "2-кімнатна квартира",
    location: "Мадрид, Лавапієс",
    price: "€750/міс",
    size: "55 м²",
    type: "Оренда",
  },
  {
    title: "Кімната в спільній квартирі",
    location: "Барселона, Ейшампле",
    price: "€420/міс",
    size: "14 м²",
    type: "Оренда",
  },
  {
    title: "Студія біля моря",
    location: "Валенсія, Мальварроса",
    price: "€580/міс",
    size: "32 м²",
    type: "Оренда",
  },
  {
    title: "3-кімнатна квартира",
    location: "Аліканте, центр",
    price: "€95,000",
    size: "78 м²",
    type: "Купівля",
  },
];

export default function RealEstatePage() {
  return (
    <CategoryLayout
      icon={Home}
      title="Нерухомість"
      subtitle="Оренда та купівля житла"
      color="text-emerald-600"
      bgColor="bg-emerald-50"
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["Усі", "Оренда", "Купівля", "Кімната"].map((filter, i) => (
          <button
            key={filter}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              i === 0
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:text-emerald-600"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Listings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sampleListings.map((listing, idx) => (
          <div
            key={idx}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-[15px] font-semibold text-gray-900">
                {listing.title}
              </h3>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md whitespace-nowrap shrink-0">
                {listing.type}
              </span>
            </div>
            <div className="space-y-1.5 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {listing.location}
              </span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Euro className="w-3.5 h-3.5" />
                  {listing.price}
                </span>
                <span className="flex items-center gap-1.5">
                  <Maximize className="w-3.5 h-3.5" />
                  {listing.size}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-8 py-6 border border-dashed border-gray-200 rounded-xl">
        <p className="text-sm text-gray-400">
          Більше оголошень з'являться незабаром
        </p>
      </div>
    </CategoryLayout>
  );
}