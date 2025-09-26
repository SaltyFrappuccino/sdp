export interface EconomyRow {
  rank: string;
  questReward: string;
  gateReward: string;
}

export interface SynkiPriceRow {
  rank: string;
  oskolok: string;
  echo: string;
  focus: string;
}

export interface LivingCost {
  category: string;
  description: string;
  price: string;
}

export const economyData: EconomyRow[] = [
  { rank: "F", questReward: "100 000 ₭", gateReward: "500 000 ₭" },
  { rank: "E", questReward: "500 000 ₭", gateReward: "2 500 000 ₭" },
  { rank: "D", questReward: "2 500 000 ₭", gateReward: "15 000 000 ₭" },
  { rank: "C", questReward: "50 000 000 ₭", gateReward: "250 000 000 ₭" },
  { rank: "B", questReward: "250 000 000 ₭", gateReward: "1 000 000 000 ₭" },
  { rank: "A", questReward: "1 000 000 000 ₭", gateReward: "10 000 000 000 ₭" },
  { rank: "S", questReward: "5 000 000 000 ₭", gateReward: "50 000 000 000 ₭" },
  { rank: "SS", questReward: "-", gateReward: "-" },
  { rank: "SSS", questReward: "-", gateReward: "-" }
];

export const synkiPricesData: SynkiPriceRow[] = [
  { rank: "F", oskolok: "50 000 ₭", echo: "Не существует", focus: "Не существует" },
  { rank: "E", oskolok: "400 000 ₭", echo: "Не существует", focus: "Не существует" },
  { rank: "D", oskolok: "2 000 000 ₭", echo: "50 000 000 ₭", focus: "Не существует" },
  { rank: "C", oskolok: "40 000 000 ₭", echo: "100 000 000 ₭", focus: "500 000 000 ₭" },
  { rank: "B", oskolok: "120 000 000 ₭", echo: "500 000 000 ₭", focus: "3 000 000 000 ₭" },
  { rank: "A", oskolok: "800 000 000 ₭", echo: "2 500 000 000 ₭", focus: "5 000 000 000 ₭" },
  { rank: "S", oskolok: "Фракционная/Национальная реликвия. Не продаётся.", echo: "15 000 000 000 ₭", focus: "10 000 000 000 ₭" },
  { rank: "SS", oskolok: "Слишком редкие, чтобы оценить.", echo: "50 000 000 000 ₭", focus: "Уникальны. Можно получить только от Существа." },
  { rank: "SSS", oskolok: "Слишком редкие, чтобы оценить.", echo: "1 000 000 000 000 ₭", focus: "Уникальны. Можно получить только от Существа." }
];

export const livingCostsData: LivingCost[] = [
  {
    category: "Базовые Расходы (за месяц)",
    description: "Аренда жилой капсулы в рабочем секторе Неон-Сити",
    price: "~70 000 ₭"
  },
  {
    category: "Базовые Расходы (за месяц)",
    description: "Аренда скромной квартиры на Соре",
    price: "~200 000 ₭"
  },
  {
    category: "Базовые Расходы (за месяц)",
    description: "Коммунальные платежи, связь, базовый пакет данных от Sber",
    price: "~30 000 ₭"
  },
  {
    category: "Базовые Расходы (за месяц)",
    description: "Питание (синтетическая еда, уличные автоматы)",
    price: "~40 000 ₭"
  },
  {
    category: "Базовые Расходы (за месяц)",
    description: "Питание (натуральные продукты, редкие визиты в кафе)",
    price: "от 150 000 ₭"
  },
  {
    category: "Расходы Проводника",
    description: "Стандартный пистолет (легальный)",
    price: "от 250 000 ₭"
  },
  {
    category: "Расходы Проводника",
    description: "Качественный бронежилет",
    price: "от 1 000 000 ₭"
  },
  {
    category: "Расходы Проводника",
    description: "Боеприпасы (одна обойма)",
    price: "1 500 - 5 000 ₭"
  },
  {
    category: "Расходы Проводника",
    description: "Медицинские услуги (залатать раны после боя)",
    price: "от 100 000 ₭"
  },
  {
    category: "Расходы Проводника",
    description: "Покупка простого Осколка F-ранга",
    price: "от 50 000 ₭"
  },
  {
    category: "Роскошь и Статус",
    description: "Квартира в престижном районе Неон-Сити",
    price: "от 200 000 000 ₭"
  },
  {
    category: "Роскошь и Статус",
    description: "Вилла в Зелёном Плаце",
    price: "от 10 000 000 000 ₭"
  },
  {
    category: "Роскошь и Статус",
    description: "Членский взнос в элитный клуб \"Элизиум\"",
    price: "500 000 000 ₭ в год"
  },
  {
    category: "Роскошь и Статус",
    description: "Эксклюзивный имплант от Arasaka",
    price: "цена обсуждается индивидуально, начинается от 1 000 000 000 ₭"
  }
];
