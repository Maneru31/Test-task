import { GiftIcon } from "lucide-react";

interface EmptyDashboardProps {
  onCreateClick: () => void;
}

export function EmptyDashboard({ onCreateClick }: EmptyDashboardProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <GiftIcon className="size-8 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-lg font-semibold">Нет вишлистов</h2>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Создайте первый вишлист и поделитесь им с друзьями и близкими.
      </p>
      <button
        onClick={onCreateClick}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Создать вишлист
      </button>
    </div>
  );
}
