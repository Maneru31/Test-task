"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { createItem } from "@/lib/listsApi";
import { useScrapeUrl } from "@/hooks/useScrapeUrl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CURRENCIES = ["RUB", "USD", "EUR"];

interface AddItemFormProps {
  listId: string;
}

export function AddItemForm({ listId }: AddItemFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [imageUrl, setImageUrl] = useState("");

  const { result: scraped, isLoading: scraping } = useScrapeUrl(url);

  // Autofill only empty fields
  useEffect(() => {
    if (!scraped) return;
    if (!name && scraped.title) setName(scraped.title);
    if (!imageUrl && scraped.image_url) setImageUrl(scraped.image_url);
    if (!price && scraped.price) setPrice(scraped.price);
    if (!currency && scraped.currency) setCurrency(scraped.currency);
  }, [scraped]); // eslint-disable-line react-hooks/exhaustive-deps

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () =>
      createItem(listId, {
        name: name.trim(),
        description: description.trim() || null,
        url: url.trim() || null,
        image_url: imageUrl.trim() || null,
        price: price.trim() || null,
        currency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list", listId] });
      toast.success("Подарок добавлен");
      resetForm();
    },
    onError: () => {
      toast.error("Не удалось добавить подарок");
    },
  });

  function resetForm() {
    setUrl("");
    setName("");
    setDescription("");
    setPrice("");
    setCurrency("RUB");
    setImageUrl("");
    setExpanded(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <PlusIcon className="size-4" />
        Добавить подарок
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-background p-4"
    >
      <h3 className="mb-4 text-sm font-semibold">Новый подарок</h3>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-url">Ссылка на товар</Label>
          <div className="relative">
            <Input
              id="add-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://... (автозаполнение через 500мс)"
              autoFocus
            />
            {scraping && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                Загрузка...
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-name">Название *</Label>
          <Input
            id="add-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название подарка"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-description">Описание</Label>
          <Input
            id="add-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Необязательно"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="add-price">Цена</Label>
            <Input
              id="add-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-currency">Валюта</Label>
            <select
              id="add-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-image-url">URL изображения</Label>
          <Input
            id="add-image-url"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
          {createMutation.isPending ? "Добавление..." : "Добавить"}
        </Button>
        <Button type="button" variant="outline" onClick={resetForm}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
