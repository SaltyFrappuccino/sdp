import React from 'react';
import { ModalPage, ModalPageHeader, PanelHeaderClose, Group, Header, Div, Text, Button } from '@vkontakte/vkui';

interface TutorialModalProps {
  gameType: 'fishing' | 'hunting_ground' | 'hunting_aerial';
  onClose: () => void;
  id: string;
}

const tutorials = {
  fishing: {
    title: "Как играть в рыбалку",
    steps: [
      "1. Выберите глубину заброса (глубже = реже, но крупнее рыба)",
      "2. Дождитесь поклевки и быстро нажмите 'ПОДСЕЧЬ' (1.5-2.5 сек)",
      "3. Удерживайте кнопку для подматывания лески",
      "4. Следите за натяжением (красная зона = леска порвется)",
      "5. Отпускайте кнопку когда натяжение высокое",
      "6. Следите за выносливостью - она восстанавливается при отдыхе"
    ],
    tips: [
      "💡 Разные виды рыб ведут себя по-разному",
      "💡 Мутированная рыба может телепортироваться",
      "💡 Агрессивная рыба делает резкие рывки",
      "💡 Убегающая рыба постоянно пытается уплыть"
    ]
  },
  hunting_ground: {
    title: "Как играть в наземную охоту",
    steps: [
      "1. Выслеживание: нажимайте стрелки в правильном направлении",
      "2. Приближение: двигайтесь к добыче (зеленая зона)",
      "3. Учитывайте ветер - не подходите с подветренной стороны",
      "4. Движение создает шум - двигайтесь осторожно",
      "5. Можно установить ловушку (если есть)",
      "6. Прицеливание: наведите прицел на добычу и стреляйте"
    ],
    tips: [
      "💡 Уровень тревоги добычи растет от шума",
      "💡 Ветер влияет на обнаружение",
      "💡 Ловушки повышают шанс успеха",
      "💡 Чем ближе прицел к добыче, тем выше точность"
    ]
  },
  hunting_aerial: {
    title: "Как играть в воздушную охоту",
    steps: [
      "1. Управляйте прицелом стрелками",
      "2. Желтая линия показывает предсказанную траекторию",
      "3. Учитывайте ветер - он сносит цели",
      "4. Лидер стаи светится золотом - дает больше очков",
      "5. При попадании в лидера стая рассеивается",
      "6. Перезаряжайтесь когда патроны закончатся (2 сек)"
    ],
    tips: [
      "💡 У вас есть 90 секунд",
      "💡 Предсказывайте траекторию движения",
      "💡 Турбулентность в Эхо-Зонах усложняет прицеливание",
      "💡 Точные попадания дают больше очков"
    ]
  }
};

const TutorialModal: React.FC<TutorialModalProps> = ({ gameType, onClose, id }) => {
  const tutorial = tutorials[gameType];

  return (
    <ModalPage
      id={id}
      onClose={onClose}
      header={
        <ModalPageHeader
          before={<PanelHeaderClose onClick={onClose} />}
        >
          {tutorial.title}
        </ModalPageHeader>
      }
    >
      <Group header={<Header>Правила игры</Header>}>
        <Div>
          {tutorial.steps.map((step, index) => (
            <Text key={index} style={{ marginBottom: 12, fontSize: 15 }}>
              {step}
            </Text>
          ))}
        </Div>
      </Group>

      <Group header={<Header>Полезные советы</Header>}>
        <Div>
          {tutorial.tips.map((tip, index) => (
            <Text key={index} style={{ marginBottom: 8, fontSize: 14, color: 'var(--text_secondary)' }}>
              {tip}
            </Text>
          ))}
        </Div>
      </Group>

      <Div>
        <Button size="l" stretched onClick={onClose}>
          Понятно, начинаем!
        </Button>
      </Div>
    </ModalPage>
  );
};

export default TutorialModal;

