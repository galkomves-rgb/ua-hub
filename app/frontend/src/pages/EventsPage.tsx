import { Calendar, MapPin, Clock, Users } from "lucide-react";
import CategoryLayout from "@/components/CategoryLayout";

const sampleEvents = [
  {
    title: "Великодній ярмарок",
    location: "Мадрид, Parque del Retiro",
    date: "12 квітня 2026",
    time: "10:00 – 18:00",
    attendees: 120,
  },
  {
    title: "Розмовний клуб іспанської",
    location: "Барселона, Café Babel",
    date: "28 березня 2026",
    time: "18:30 – 20:00",
    attendees: 25,
  },
  {
    title: "Концерт української музики",
    location: "Валенсія, Sala Russafa",
    date: "5 квітня 2026",
    time: "20:00 – 22:30",
    attendees: 85,
  },
  {
    title: "Зустріч для мам з дітьми",
    location: "Аліканте, Parque Lo Morant",
    date: "30 березня 2026",
    time: "11:00 – 13:00",
    attendees: 30,
  },
];

export default function EventsPage() {
  return (
    <CategoryLayout
      icon={Calendar}
      title="Події"
      subtitle="Заходи та зустрічі громади"
      color="text-amber-500"
      bgColor="bg-amber-50"
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["Усі", "Цього тижня", "Цього місяця", "Мадрид", "Барселона"].map(
          (filter, i) => (
            <button
              key={filter}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                i === 0
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-gray-500 border-gray-200 hover:border-amber-300 hover:text-amber-600"
              }`}
            >
              {filter}
            </button>
          )
        )}
      </div>

      {/* Events */}
      <div className="space-y-3">
        {sampleEvents.map((event, idx) => (
          <div
            key={idx}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <h3 className="text-[15px] font-semibold text-gray-900 mb-2">
              {event.title}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {event.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {event.time}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {event.location}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {event.attendees} учасників
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-8 py-6 border border-dashed border-gray-200 rounded-xl">
        <p className="text-sm text-gray-400">
          Більше подій з'являться незабаром
        </p>
      </div>
    </CategoryLayout>
  );
}