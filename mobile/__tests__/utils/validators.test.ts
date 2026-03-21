import {
  loginSchema,
  registerSchema,
  createListSchema,
  itemSchema,
} from '@/utils/validators';

describe('loginSchema', () => {
  it('принимает валидные данные', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret123' });
    expect(result.success).toBe(true);
  });

  it('отклоняет некорректный email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('отклоняет пустой email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('отклоняет пароль короче 6 символов', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '123' });
    expect(result.success).toBe(false);
  });

  it('отклоняет пустой пароль', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('принимает валидные данные', () => {
    const result = registerSchema.safeParse({
      display_name: 'Иван',
      email: 'ivan@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('отклоняет имя короче 2 символов', () => {
    const result = registerSchema.safeParse({
      display_name: 'И',
      email: 'ivan@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('отклоняет имя длиннее 50 символов', () => {
    const result = registerSchema.safeParse({
      display_name: 'А'.repeat(51),
      email: 'ivan@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('отклоняет некорректный email', () => {
    const result = registerSchema.safeParse({
      display_name: 'Иван',
      email: 'bad',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('отклоняет пароль короче 6 символов', () => {
    const result = registerSchema.safeParse({
      display_name: 'Иван',
      email: 'ivan@example.com',
      password: '12345',
    });
    expect(result.success).toBe(false);
  });
});

describe('createListSchema', () => {
  it('принимает минимально валидные данные (только title)', () => {
    const result = createListSchema.safeParse({ title: 'Мой список' });
    expect(result.success).toBe(true);
  });

  it('принимает полные данные', () => {
    const result = createListSchema.safeParse({
      title: 'День рождения',
      description: 'Список подарков',
      occasion: 'birthday',
      occasion_date: '2024-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('отклоняет пустой title', () => {
    const result = createListSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('отклоняет title длиннее 100 символов', () => {
    const result = createListSchema.safeParse({ title: 'x'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('отклоняет невалидный occasion', () => {
    const result = createListSchema.safeParse({ title: 'Test', occasion: 'holiday' });
    expect(result.success).toBe(false);
  });

  it('принимает occasion = null', () => {
    const result = createListSchema.safeParse({ title: 'Test', occasion: null });
    expect(result.success).toBe(true);
  });
});

describe('itemSchema', () => {
  it('принимает минимально валидные данные (только name)', () => {
    const result = itemSchema.safeParse({ name: 'Книга' });
    expect(result.success).toBe(true);
  });

  it('принимает полные данные', () => {
    const result = itemSchema.safeParse({
      name: 'Наушники Sony',
      description: 'WH-1000XM5',
      url: 'https://sony.com/headphones',
      price: 29999,
      currency: 'RUB',
      is_group_fund: false,
      target_amount: null,
    });
    expect(result.success).toBe(true);
  });

  it('отклоняет пустое name', () => {
    const result = itemSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('отклоняет некорректный url', () => {
    const result = itemSchema.safeParse({ name: 'Test', url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('принимает пустую строку url (не обязательно)', () => {
    const result = itemSchema.safeParse({ name: 'Test', url: '' });
    expect(result.success).toBe(true);
  });

  it('отклоняет отрицательную цену', () => {
    const result = itemSchema.safeParse({ name: 'Test', price: -1 });
    expect(result.success).toBe(false);
  });

  it('устанавливает currency = RUB по умолчанию', () => {
    const result = itemSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('RUB');
    }
  });
});
