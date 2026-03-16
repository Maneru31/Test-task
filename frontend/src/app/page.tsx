import Link from "next/link";
import { GiftIcon, ZapIcon, EyeOffIcon, UsersIcon, ArrowRightIcon, CheckIcon } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500">
              <GiftIcon className="size-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Wishify</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Войти
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-orange-400 active:scale-95"
            >
              Начать бесплатно
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm text-orange-400">
            <ZapIcon className="size-3.5" />
            Реалтайм обновления — все видят изменения мгновенно
          </div>

          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
            Вишлист, который{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
              работает
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-lg text-zinc-400">
            Создай список желаний, поделись ссылкой с друзьями. Они зарезервируют подарки — ты не узнаешь кто что взял. Сюрприз сохранён.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-400 hover:shadow-orange-400/30 active:scale-95"
            >
              Создать вишлист
              <ArrowRightIcon className="size-4" />
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-700 px-8 py-3.5 text-base font-semibold text-zinc-300 transition-all hover:border-zinc-500 hover:text-white"
            >
              Войти
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">
            Всё что нужно для{" "}
            <span className="text-orange-400">идеального подарка</span>
          </h2>
          <p className="mb-16 text-center text-zinc-500">
            Никаких ненужных подарков. Никаких повторов.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: <GiftIcon className="size-6" />,
                title: "Список желаний",
                desc: "Добавляй товары с ценой, картинкой и ссылкой. Вставь URL — данные подтянутся автоматически.",
              },
              {
                icon: <EyeOffIcon className="size-6" />,
                title: "Сюрприз сохранён",
                desc: "Ты не видишь кто что зарезервировал. Друзья координируются между собой — ты получаешь только сюрпризы.",
              },
              {
                icon: <UsersIcon className="size-6" />,
                title: "Скиньтесь вместе",
                desc: "На дорогой подарок можно скинуться. Прогресс-бар показывает сколько уже собрано.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition-all hover:border-orange-500/40 hover:bg-zinc-800/80"
              >
                <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-16 text-center text-3xl font-bold md:text-4xl">
            Как это работает
          </h2>
          <div className="flex flex-col gap-6 md:flex-row md:gap-8">
            {[
              { n: "01", title: "Создай список", desc: "Зарегистрируйся и добавь желаемые подарки с ценами и ссылками." },
              { n: "02", title: "Поделись ссылкой", desc: "Отправь ссылку друзьям — они откроют список без регистрации." },
              { n: "03", title: "Получи подарки", desc: "Друзья резервируют подарки. Ты видишь только то, что ещё свободно." },
            ].map((s) => (
              <div key={s.n} className="flex flex-1 flex-col items-center text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-xl font-bold text-orange-400">
                  {s.n}
                </div>
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm text-zinc-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-amber-500/5 p-12 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Готов создать вишлист?
          </h2>
          <p className="mb-8 text-zinc-400">
            Бесплатно. Без лишнего. Работает прямо сейчас.
          </p>
          <div className="mb-8 flex flex-col items-center gap-3">
            {["Автозаполнение по ссылке с магазина", "Публичная ссылка без регистрации", "Реалтайм — все видят изменения мгновенно"].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm text-zinc-400">
                <CheckIcon className="size-4 text-orange-400" />
                {t}
              </div>
            ))}
          </div>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-8 py-3.5 font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-400 active:scale-95"
          >
            Начать бесплатно
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-orange-500">
              <GiftIcon className="size-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-400">Wishify</span>
          </div>
          <p className="text-xs text-zinc-600">© 2026 Wishify</p>
        </div>
      </footer>
    </div>
  );
}
