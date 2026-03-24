import { Wrench, Star, MapPin, Phone } from "lucide-react";
import CategoryLayout from "@/components/CategoryLayout";

const sampleServices = [
  {
    title: "Переклад документів UA-ES",
    provider: "Оксана М.",
    location: "Мадрид / Онлайн",
    rating: 4.9,
    category: "Переклади",
  },
  {
    title: "Сантехнік — терміновий виклик",
    provider: "Андрій К.",
    location: "Барселона",
    rating: 4.7,
    category: "Ремонт",
  },
  {
    title: "Репетитор іспанської мови",
    provider: "Марія Л.",
    location: "Валенсія / Онлайн",
    rating: 5.0,
    category: "Освіта",
  },
  {
    title: "Перевезення та переїзди",
    provider: "Сергій В.",
    location: "Мадрид",
    rating: 4.8,
    category: "Транспорт",
  },
];

export default function ServicesPage() {
  return (
    <CategoryLayout
      icon={Wrench}
      title="Послуги"
      subtitle="Майстри, переклади, консультації"
      color="text-violet-600"
      bgColor="bg-violet-50"
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["Усі", "Переклади", "Ремонт", "Освіта", "Транспорт"].map(
          (filter, i) => (
            <button
              key={filter}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                i === 0
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-violet-300 hover:text-violet-600"
              }`}
            >
              {filter}
            </button>
          )
        )}
      </div>

      {/* Services */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sampleServices.map((service, idx) => (
          <div
            key={idx}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-violet-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-[15px] font-semibold text-gray-900">
                {service.title}
              </h3>
              <span className="text-xs text-violet-600 bg-violet-50 px-2 py-1 rounded-md whitespace-nowrap shrink-0">
                {service.category}
              </span>
            </div>
            <div className="space-y-1.5 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {service.provider}
              </span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {service.location}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {service.rating}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-8 py-6 border border-dashed border-gray-200 rounded-xl">
        <p className="text-sm text-gray-400">
          Більше послуг з'являться незабаром
        </p>
      </div>
    </CategoryLayout>
  );
}