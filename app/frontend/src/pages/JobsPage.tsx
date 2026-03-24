import { Briefcase, MapPin, Clock, Building2 } from "lucide-react";
import CategoryLayout from "@/components/CategoryLayout";

const sampleJobs = [
  {
    title: "Офіціант/ка",
    company: "Restaurante Sol",
    location: "Мадрид",
    type: "Повна зайнятість",
    posted: "2 дні тому",
  },
  {
    title: "Прибиральник/ця",
    company: "CleanPro Services",
    location: "Барселона",
    type: "Часткова зайнятість",
    posted: "5 днів тому",
  },
  {
    title: "Водій доставки",
    company: "Delivery Express",
    location: "Валенсія",
    type: "Повна зайнятість",
    posted: "1 день тому",
  },
  {
    title: "Перекладач UA-ES",
    company: "LinguaLink",
    location: "Віддалено",
    type: "Фріланс",
    posted: "3 дні тому",
  },
];

export default function JobsPage() {
  return (
    <CategoryLayout
      icon={Briefcase}
      title="Робота"
      subtitle="Вакансії та працевлаштування"
      color="text-blue-600"
      bgColor="bg-blue-50"
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["Усі", "Мадрид", "Барселона", "Валенсія", "Віддалено"].map(
          (filter, i) => (
            <button
              key={filter}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                i === 0
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {filter}
            </button>
          )
        )}
      </div>

      {/* Job listings */}
      <div className="space-y-3">
        {sampleJobs.map((job, idx) => (
          <div
            key={idx}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-gray-900">
                  {job.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {job.company}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {job.posted}
                  </span>
                </div>
              </div>
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md whitespace-nowrap shrink-0">
                {job.type}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state hint */}
      <div className="text-center mt-8 py-6 border border-dashed border-gray-200 rounded-xl">
        <p className="text-sm text-gray-400">
          Більше вакансій з'являться незабаром
        </p>
      </div>
    </CategoryLayout>
  );
}