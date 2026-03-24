import { Heart, Users, MessageCircle, Sparkles } from "lucide-react";
import CategoryLayout from "@/components/CategoryLayout";

const features = [
  {
    icon: Users,
    title: "Профілі",
    desc: "Створіть свій профіль та знаходьте людей поруч",
  },
  {
    icon: MessageCircle,
    title: "Повідомлення",
    desc: "Спілкуйтесь у зручному чаті",
  },
  {
    icon: Sparkles,
    title: "Сумісність",
    desc: "Знаходьте людей зі спільними інтересами",
  },
];

export default function DatingPage() {
  return (
    <CategoryLayout
      icon={Heart}
      title="Знайомства"
      subtitle="Нові знайомства та спілкування"
      color="text-rose-500"
      bgColor="bg-rose-50"
    >
      {/* Coming soon notice */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm font-medium text-amber-600">
            Скоро відкриття
          </span>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          Розділ знайомств зараз у розробці. Тут ви зможете знайти нових друзів,
          партнерів та однодумців серед українців в Іспанії.
        </p>
      </div>

      {/* Feature preview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-gray-200 rounded-xl p-4 text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center mx-auto mb-3">
                <Icon className="w-5 h-5 text-rose-500" strokeWidth={2} />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {feature.title}
              </h3>
              <p className="text-xs text-gray-400">{feature.desc}</p>
            </div>
          );
        })}
      </div>
    </CategoryLayout>
  );
}