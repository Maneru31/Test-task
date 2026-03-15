import { PackageOpenIcon } from "lucide-react";

export function EmptyOwnerList() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <PackageOpenIcon className="size-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-base font-semibold">Список пуст</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Добавьте первый подарок, вставив ссылку или заполнив форму вручную.
      </p>
    </div>
  );
}
