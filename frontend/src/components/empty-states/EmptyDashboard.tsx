import { GiftIcon, SparklesIcon } from "lucide-react";

interface EmptyDashboardProps {
  onCreateClick: () => void;
}

export function EmptyDashboard({ onCreateClick }: EmptyDashboardProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-5 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-pink-500/20">
        <GiftIcon className="size-10 text-primary" />
      </div>
      <h2 className="mb-2 text-xl font-bold">Нет вишлистов</h2>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Создайте первый вишлист и поделитесь им с друзьями и близкими — пусть знают, что тебе подарить!
      </p>
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
      >
        <SparklesIcon className="size-4" />
        Создать первый вишлист
      </button>
    </div>
  );
}
