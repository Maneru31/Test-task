"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateItem } from "@/lib/listsApi";
import { useScrapeUrl } from "@/hooks/useScrapeUrl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Item } from "@/types";

const CURRENCIES = ["RUB", "USD", "EUR"];

interface EditItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  item: Item;
}

export function EditItemModal({ open, onOpenChange, listId, item }: EditItemModalProps) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [url, setUrl] = useState(item.url ?? "");
  const [imageUrl, setImageUrl] = useState(item.image_url ?? "");
  const [price, setPrice] = useState(item.price ?? "");
  const [currency, setCurrency] = useState(item.currency ?? "RUB");

  const { result: scraped, isLoading: scraping } = useScrapeUrl(url);

  // Autofill empty fields when scrape result arrives
  useEffect(() => {
    if (!scraped) return;
    if (!name && scraped.title) setName(scraped.title);
    if (!imageUrl && scraped.image_url) setImageUrl(scraped.image_url);
    if (!price && scraped.price) setPrice(scraped.price);
    if (!currency && scraped.currency) setCurrency(scraped.currency);
  }, [scraped]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to item values when modal opens
  useEffect(() => {
    if (open) {
      setName(item.name);
      setDescription(item.description ?? "");
      setUrl(item.url ?? "");
      setImageUrl(item.image_url ?? "");
      setPrice(item.price ?? "");
      setCurrency(item.currency ?? "RUB");
    }
  }, [open, item]);

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: () =>
      updateItem(listId, item.id, {
        name: name.trim() || null,
        description: description.trim() || null,
        url: url.trim() || null,
        image_url: imageUrl.trim() || null,
        price: price.trim() || null,
        currency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list", listId] });
      toast.success("Подарок обновлён");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Не удалось обновить подарок");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    updateMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать подарок</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-url">Ссылка на товар</Label>
            <div className="relative">
              <Input
                id="edit-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
              {scraping && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  Загрузка...
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">Название *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название подарка"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-description">Описание</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Необязательно"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="edit-price">Цена</Label>
              <Input
                id="edit-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-currency">Валюта</Label>
              <select
                id="edit-currency"
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
            <Label htmlFor="edit-image-url">URL изображения</Label>
            <Input
              id="edit-image-url"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || updateMutation.isPending}>
              {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
