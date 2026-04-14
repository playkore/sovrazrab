import type { EventCard } from "./types";

export const CARDS: EventCard[] = [
  {
    id: "onboarding",
    title: "Распределение",
    arc: "career",
    kind: "milestone",
    priority: 100,
    weight: 1,
    once: true,
    conditions: { minAge: 22, maxAge: 22 },
    text: "Ты получаешь распределение в НИИ Вычислительных Машин. Тебя ставят к терминалу, выдают пропуск и пачку перфокарт. Вопрос простой: останешься ли ты здесь надолго?",
    choices: {
      yes: {
        label: "Принять судьбу",
        outcome: {
          stats: { loyalty: 5, reputation: 5, stress: -2 },
          logTitle: "Распределение принято",
          logDetail: "Ты вошел в НИИ как младший научный сотрудник.",
        },
      },
      no: {
        label: "Сомневаться",
        outcome: {
          stats: { stress: 4, reputation: -2, money: -2 },
          logTitle: "Сомнения при входе",
          logDetail: "Первый день в НИИ начался с внутреннего саботажа.",
        },
      },
    },
  },
  {
    id: "perforated_cards",
    title: "Колода на полу",
    arc: "career",
    weight: 12,
    cooldownTurns: 8,
    text: "Ты случайно рассыпал колоду из 500 немаркированных перфокарт. Попытаешься собрать ее по памяти?",
    choices: {
      yes: {
        label: "Собирать",
        outcome: {
          stats: { tech: 8, stress: 6, reputation: 3 },
          logTitle: "Колода спасена",
          logDetail: "Память не подвела, но ночь ушла безвозвратно.",
        },
      },
      no: {
        label: "Скрыть",
        outcome: {
          stats: { stress: 3, loyalty: 2, reputation: -4 },
          logTitle: "Сделан вид, что ничего не случилось",
          logDetail: "Колода исчезла в шкафу с архивами. Разберутся потом.",
        },
      },
    },
  },
  {
    id: "lamp_failure",
    title: "Перегоревшая лампа",
    arc: "career",
    weight: 10,
    cooldownTurns: 10,
    conditions: { statMin: { tech: 10 } },
    text: "В главном мейнфрейме перегорела дефицитная вакуумная лампа. Поставишь вместо нее нестандартную деталь с черного рынка?",
    choices: {
      yes: {
        label: "Поставить",
        outcome: {
          stats: { tech: 10, money: -12, stress: 2, loyalty: -4 },
          setFlags: { has_blackmarket_implant: true },
          logTitle: "Нестандартная деталь на месте",
          logDetail: "Система ожила, но в отчет лучше это не заносить.",
        },
      },
      no: {
        label: "Ждать инженеров",
        outcome: {
          stats: { stress: 5, reputation: 2, money: -2 },
          logTitle: "Официальный путь",
          logDetail: "Техника простаивала дольше, чем хотелось.",
        },
      },
    },
  },
  {
    id: "deadline_overtime",
    title: "Ночной кранч",
    arc: "career",
    weight: 14,
    cooldownTurns: 6,
    conditions: { statMax: { stress: 92 } },
    text: "Компиляция проекта займет всю ночь. Оставишь ЭВМ работать без присмотра и сам уйдешь спать?",
    choices: {
      yes: {
        label: "Оставить",
        outcome: {
          stats: { tech: 4, stress: -5, health: -3, reputation: 2 },
          logTitle: "Компиляция без присмотра",
          logDetail: "Утром ты получил результат и пару седых волос.",
        },
      },
      no: {
        label: "Дежурить",
        outcome: {
          stats: { tech: 6, stress: 8, health: -4, reputation: 4 },
          logTitle: "Дежурство продолжено",
          logDetail: "Твоя дисциплина заметна, твои нервы - тоже.",
        },
      },
    },
  },
  {
    id: "party_meeting",
    title: "Партсобрание",
    arc: "politics",
    weight: 12,
    cooldownTurns: 9,
    text: "На партсобрании предлагают публично поддержать план руководства и выступить с короткой речью. Поддержишь?",
    choices: {
      yes: {
        label: "Поддержать",
        outcome: {
          stats: { loyalty: 12, reputation: 4, stress: 2, money: 1 },
          logTitle: "Позиция зафиксирована",
          logDetail: "Тебя запомнили как удобного человека.",
        },
      },
      no: {
        label: "Отмолчаться",
        outcome: {
          stats: { loyalty: -6, reputation: -3, stress: 4 },
          setFlags: { kgb_suspicion: true },
          logTitle: "Не очень удобная пауза",
          logDetail: "Кто-то в зале записал твое молчание в блокнот.",
        },
      },
    },
  },
  {
    id: "report_snitch",
    title: "Донос",
    arc: "politics",
    weight: 8,
    cooldownTurns: 14,
    conditions: { statMin: { loyalty: 20 } },
    text: "Тебе намекают, что на коллегу лучше подготовить служебную записку. Это может помочь карьере, но испортит воздух в отделе.",
    choices: {
      yes: {
        label: "Написать",
        outcome: {
          stats: { loyalty: 18, reputation: -8, stress: 4 },
          setFlags: { snitched_on_ivan: true },
          logTitle: "Записка ушла наверх",
          logDetail: "Формально все чисто. Неформально - нет.",
        },
      },
      no: {
        label: "Отказаться",
        outcome: {
          stats: { loyalty: -2, reputation: 5, stress: 2 },
          logTitle: "Переход в нейтралитет",
          logDetail: "Ты не пошел на прямой конфликт.",
        },
      },
    },
  },
  {
    id: "sanatorium",
    title: "Путевка в санаторий",
    arc: "health",
    weight: 10,
    cooldownTurns: 12,
    conditions: { statMin: { stress: 25 } },
    text: "Профком выделяет льготную путевку в санаторий «Электронные Зори». Поедешь восстанавливать нервы?",
    choices: {
      yes: {
        label: "Поехать",
        outcome: {
          stats: { health: 16, stress: -18, money: -8, reputation: 2 },
          logTitle: "Санаторий помог",
          logDetail: "Серый воздух сменился серым, но лечебным.",
        },
      },
      no: {
        label: "Остаться",
        outcome: {
          stats: { stress: 5, health: -3, tech: 2 },
          logTitle: "Рабочий режим не нарушен",
          logDetail: "Ты выбрал не отдых, а еще один отчет.",
        },
      },
    },
  },
  {
    id: "stimulator",
    title: "Стимулятор",
    arc: "health",
    weight: 11,
    cooldownTurns: 8,
    text: "Коллеги предлагают табачно-кофейный стимулятор «Ударник». Он поднимет продуктивность, но потом придется расплачиваться нервами.",
    choices: {
      yes: {
        label: "Принять",
        outcome: {
          stats: { tech: 5, stress: 10, health: -6, reputation: 1 },
          logTitle: "Рывок удался",
          logDetail: "Тело запомнило это решение.",
        },
      },
      no: {
        label: "Отказаться",
        outcome: {
          stats: { health: 3, stress: -4, reputation: 1 },
          logTitle: "Сдержанность",
          logDetail: "Силы сохранились, темп упал.",
        },
      },
    },
  },
  {
    id: "colleague_help",
    title: "Коллега просит помочь",
    arc: "relations",
    weight: 13,
    cooldownTurns: 5,
    text: "Коллега просит сделать за него часть расчетов, пока он бегает за дефицитной колбасой. Поможешь?",
    choices: {
      yes: {
        label: "Помочь",
        outcome: {
          stats: { reputation: 8, stress: 4, tech: 3, loyalty: 1 },
          logTitle: "Связи укреплены",
          logDetail: "В отделе стало немного теплее.",
        },
      },
      no: {
        label: "Отказать",
        outcome: {
          stats: { reputation: -5, stress: 2, loyalty: -1 },
          logTitle: "Холодная дистанция",
          logDetail: "Коллега запомнил отказ.",
        },
      },
    },
  },
  {
    id: "burnout_crisis",
    title: "Выгорание",
    arc: "crisis",
    kind: "crisis",
    priority: 200,
    weight: 1,
    cooldownTurns: 30,
    conditions: { statMin: { stress: 90 } },
    text: "Ты слишком долго держался на переработках. Организм требует остановки прямо сейчас.",
    choices: {
      yes: {
        label: "Сдаться",
        outcome: {
          stats: { health: -18, stress: -35, money: -10 },
          logTitle: "Кризисный отпуск",
          logDetail: "Тебя сняли с линии на восстановление.",
        },
      },
      no: {
        label: "Продолжить",
        outcome: {
          stats: { health: -12, stress: 8, reputation: -4 },
          logTitle: "Непосильный темп",
          logDetail: "Ты выбрал еще один круг по одной и той же лестнице.",
        },
      },
    },
  },
  {
    id: "red_screen",
    title: "Красный экран",
    arc: "milestone",
    kind: "milestone",
    priority: 180,
    weight: 1,
    once: true,
    conditions: { minAge: 47 },
    text: "Всесоюзная ЭВМ выдала красный экран. Кто-то должен ответить за сбой.",
    choices: {
      yes: {
        label: "Взять на себя",
        outcome: {
          stats: { loyalty: 10, reputation: -6, money: 8 },
          setFlags: { project_ogas_sabotaged: true },
          logTitle: "Козел отпущения найден",
          logDetail: "Ты удержался в системе ценой чужой и своей репутации.",
        },
      },
      no: {
        label: "Отказаться",
        outcome: {
          stats: { loyalty: -12, reputation: 8, stress: 6 },
          setFlags: { kgb_suspicion: true },
          logTitle: "Неловкий отказ",
          logDetail: "Система запомнила, что ты не сразу согласился.",
        },
      },
    },
  },
  {
    id: "pension_committee",
    title: "Пенсионный комитет",
    arc: "milestone",
    kind: "milestone",
    priority: 300,
    weight: 1,
    once: true,
    conditions: { minAge: 60 },
    text: "Пришло время пенсионного комитета. Система подводит итоги твоей карьеры, здоровья и репутации.",
    choices: {
      yes: {
        label: "Принять итог",
        outcome: {
          endGame: "Ты уходишь на пенсию, и НИИ на удивление продолжает работать без тебя.",
          logTitle: "Пенсия оформлена",
          logDetail: "Жизнь в системе завершена, история - нет.",
        },
      },
      no: {
        label: "Попробовать остаться",
        outcome: {
          stats: { loyalty: -2, reputation: 2, stress: 8 },
          logTitle: "Последняя попытка",
          logDetail: "Комитет не любит торговаться, но выслушал.",
        },
      },
    },
  },
];
