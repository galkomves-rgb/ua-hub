import { Scale, FileText, Shield, HelpCircle } from "lucide-react";
import CategoryLayout from "@/components/CategoryLayout";

const topics = [
  {
    icon: FileText,
    title: "NIE та резиденція",
    desc: "Як отримати NIE, TIE, дозвіл на проживання та роботу в Іспанії",
  },
  {
    icon: Shield,
    title: "Тимчасовий захист",
    desc: "Статус тимчасового захисту для українців, продовження та права",
  },
  {
    icon: HelpCircle,
    title: "Соціальна допомога",
    desc: "Медичне страхування, допомога на дітей, соціальні виплати",
  },
  {
    icon: FileText,
    title: "Визнання документів",
    desc: "Легалізація дипломів, водійських прав, свідоцтв",
  },
];

const contacts = [
  {
    name: "Консульство України в Мадриді",
    info: "+34 91 748 93 60",
  },
  {
    name: "Консульство України в Барселоні",
    info: "+34 93 201 43 22",
  },
  {
    name: "Cruz Roja (Червоний Хрест)",
    info: "900 22 22 92",
  },
];

export default function LegalHelpPage() {
  return (
    <CategoryLayout
      icon={Scale}
      title="Юридична допомога"
      subtitle="Документи, легалізація, поради"
      color="text-sky-600"
      bgColor="bg-sky-50"
    >
      {/* Topics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {topics.map((topic, idx) => {
          const Icon = topic.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-sky-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-sky-600" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">
                    {topic.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-snug">
                    {topic.desc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Useful contacts */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-4">
          Корисні контакти
        </h2>
        <div className="space-y-2">
          {contacts.map((contact, idx) => (
            <div
              key={idx}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <span className="text-sm font-medium text-gray-700">
                {contact.name}
              </span>
              <span className="text-sm text-sky-600 font-medium">
                {contact.info}
              </span>
            </div>
          ))}
        </div>
      </div>
    </CategoryLayout>
  );
}