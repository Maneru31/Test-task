import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email обязателен')
    .email('Введите корректный email'),
  password: z
    .string()
    .min(1, 'Пароль обязателен')
    .min(6, 'Пароль минимум 6 символов'),
});

export const registerSchema = z.object({
  display_name: z
    .string()
    .min(1, 'Имя обязательно')
    .min(2, 'Имя минимум 2 символа')
    .max(50, 'Имя максимум 50 символов'),
  email: z
    .string()
    .min(1, 'Email обязателен')
    .email('Введите корректный email'),
  password: z
    .string()
    .min(1, 'Пароль обязателен')
    .min(6, 'Пароль минимум 6 символов')
    .max(100, 'Пароль максимум 100 символов'),
});

export const createListSchema = z.object({
  title: z
    .string()
    .min(1, 'Название обязательно')
    .max(100, 'Название максимум 100 символов'),
  description: z.string().max(500, 'Описание максимум 500 символов').optional(),
  occasion: z
    .enum(['birthday', 'new_year', 'wedding', 'other'])
    .optional()
    .nullable(),
  occasion_date: z.string().optional().nullable(),
});

export const itemSchema = z.object({
  name: z
    .string()
    .min(1, 'Название обязательно')
    .max(200, 'Название максимум 200 символов'),
  description: z.string().max(1000, 'Описание максимум 1000 символов').optional(),
  url: z.string().url('Введите корректный URL').optional().or(z.literal('')),
  price: z
    .number()
    .min(0, 'Цена не может быть отрицательной')
    .optional()
    .nullable(),
  currency: z.string().default('RUB'),
  is_group_fund: z.boolean().default(false),
  target_amount: z
    .number()
    .min(0, 'Целевая сумма не может быть отрицательной')
    .optional()
    .nullable(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CreateListFormData = z.infer<typeof createListSchema>;
export type ItemFormData = z.infer<typeof itemSchema>;
