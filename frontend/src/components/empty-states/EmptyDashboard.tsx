import { GiftIcon, SparklesIcon } from "lucide-react";

interface EmptyDashboardProps {
  onCreateClick: () => void;
}

export function EmptyDashboard({ onCreateClick }: EmptyDashboardProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-5 flex size-20 items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900">
        <GiftIcon className="size-9 text-orange-500" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-white">Нет вишлистов</h2>
      <p className="mb-6 max-w-sm text-sm text-zinc-500">
        Создайте первый вишлист и поделитесь им с друзьями — пусть знают, что тебе подарить!
      </p>
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-400 active:scale-95"
      >
        <SparklesIcon className="size-4" />
        Создать первый вишлист
      </button>
    </div>
  );
}
