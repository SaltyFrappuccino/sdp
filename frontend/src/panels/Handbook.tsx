import React, { useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Cell,
  Search,
  Div,
  Spinner,
  Accordion,
  Title,
  Text,
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import ReactMarkdown from 'react-markdown';
import { Icon28BookOutline, Icon28ListOutline } from '@vkontakte/icons';

interface NavIdProps {
  id: string;
}

interface TOCItem {
  id: string;
  title: string;
  level: number;
  children?: TOCItem[];
}

const STORAGE_KEY = 'handbook_scroll_position';

export const Handbook: React.FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [markdownContent, setMarkdownContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toc, setToc] = useState<TOCItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  const [showTOC, setShowTOC] = useState(true);

  // Загрузка markdown файла
  useEffect(() => {
    fetch('/Основная Статья.md')
      .then((response) => response.text())
      .then((text) => {
        setMarkdownContent(text);
        setLoading(false);
        
        // Парсим оглавление из markdown
        const tocItems = parseTableOfContents(text);
        setToc(tocItems);
        
        // Восстанавливаем позицию скролла
        const savedPosition = localStorage.getItem(STORAGE_KEY);
        if (savedPosition) {
          setTimeout(() => {
            const element = document.getElementById(savedPosition);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
              setActiveSection(savedPosition);
            }
          }, 100);
        }
      })
      .catch((error) => {
        console.error('Ошибка загрузки справочника:', error);
        setLoading(false);
      });
  }, []);

  // Парсинг оглавления из markdown
  const parseTableOfContents = (content: string): TOCItem[] => {
    const lines = content.split('\n');
    const tocItems: TOCItem[] = [];
    const stack: TOCItem[] = [];

    lines.forEach((line) => {
      // Ищем заголовки (###, ####, #####)
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const title = match[2].replace(/<a name="[^"]+"><\/a>/, '').trim();
        
        // Извлекаем ID из якоря или создаем из заголовка
        const anchorMatch = line.match(/<a name="([^"]+)"><\/a>/);
        const anchorId = anchorMatch ? anchorMatch[1] : slugify(title);

        const item: TOCItem = {
          id: anchorId,
          title,
          level,
          children: [],
        };

        // Строим иерархию
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }

        if (stack.length === 0) {
          tocItems.push(item);
        } else {
          stack[stack.length - 1].children!.push(item);
        }

        stack.push(item);
      }
    });

    return tocItems;
  };

  // Создание slug из заголовка
  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\wа-яё\s-]/g, '')
      .replace(/\s+/g, '-');
  };

  // Фильтрация контента по поисковому запросу
  const getFilteredContent = () => {
    if (!searchQuery.trim()) return markdownContent;

    const lines = markdownContent.split('\n');
    const filtered: string[] = [];
    let includeSection = false;
    let currentSection: string[] = [];

    lines.forEach((line) => {
      // Начало новой секции (заголовок)
      if (line.match(/^#{1,6}\s+/)) {
        // Сохраняем предыдущую секцию если она подходит
        if (includeSection && currentSection.length > 0) {
          filtered.push(...currentSection, '---', '');
        }
        currentSection = [line];
        includeSection = line.toLowerCase().includes(searchQuery.toLowerCase());
      } else {
        currentSection.push(line);
        if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
          includeSection = true;
        }
      }
    });

    // Добавляем последнюю секцию
    if (includeSection && currentSection.length > 0) {
      filtered.push(...currentSection);
    }

    return filtered.length > 0 ? filtered.join('\n') : '# Ничего не найдено\n\nПопробуйте изменить поисковый запрос.';
  };

  // Переход к секции
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
      localStorage.setItem(STORAGE_KEY, sectionId);
    }
  };

  // Рендер элемента оглавления
  const renderTOCItem = (item: TOCItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = activeSection === item.id;

    if (hasChildren && depth === 0) {
      // Главы - используем Accordion
      return (
        <Accordion key={item.id}>
          <Accordion.Summary>
            <Text weight="2">{item.title}</Text>
          </Accordion.Summary>
          <Accordion.Content>
            {item.children!.map((child) => renderTOCItem(child, depth + 1))}
          </Accordion.Content>
        </Accordion>
      );
    } else {
      // Обычные секции - используем Cell
      return (
        <Cell
          key={item.id}
          onClick={() => scrollToSection(item.id)}
          style={{
            paddingLeft: `${depth * 16 + 12}px`,
            cursor: 'pointer',
            backgroundColor: isActive ? 'var(--vkui--color_background_accent)' : undefined,
            fontWeight: isActive ? 'bold' : 'normal',
          }}
        >
          {item.title}
        </Cell>
      );
    }
  };

  // Кастомный рендерер для заголовков с якорями
  const renderHeading = ({ level, children }: any) => {
    const text = children.toString();
    const anchorMatch = text.match(/<a name="([^"]+)"><\/a>/);
    const anchorId = anchorMatch ? anchorMatch[1] : slugify(text);
    const cleanText = text.replace(/<a name="[^"]+"><\/a>/, '').trim();

    const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;

    return (
      <HeadingTag
        id={anchorId}
        style={{
          scrollMarginTop: '70px',
          marginTop: level === 1 ? '24px' : level === 2 ? '20px' : '16px',
          marginBottom: '12px',
        }}
      >
        {cleanText}
      </HeadingTag>
    );
  };

  if (loading) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
          Справочник
        </PanelHeader>
        <Div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Spinner size="m" />
        </Div>
      </Panel>
    );
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
        Справочник
      </PanelHeader>

      <Group>
        <Search
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по справочнику..."
        />
      </Group>

      <Group>
        <Cell
          before={showTOC ? <Icon28ListOutline /> : <Icon28BookOutline />}
          onClick={() => setShowTOC(!showTOC)}
          style={{ cursor: 'pointer', fontWeight: 'bold' }}
        >
          {showTOC ? 'Скрыть оглавление' : 'Показать оглавление'}
        </Cell>
      </Group>

      {showTOC && !searchQuery && (
        <Group header={<Title level="2" style={{ padding: '12px' }}>Оглавление</Title>}>
          {toc.map((item) => renderTOCItem(item))}
        </Group>
      )}

      <Group>
        <Div
          style={{
            padding: '16px',
            lineHeight: '1.6',
          }}
          className="markdown-content"
        >
          <ReactMarkdown
            components={{
              h1: renderHeading,
              h2: renderHeading,
              h3: renderHeading,
              h4: renderHeading,
              h5: renderHeading,
              h6: renderHeading,
              // Стилизация таблиц
              table: ({ children }) => (
                <div style={{ overflowX: 'auto', margin: '16px 0' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid var(--vkui--color_separator_primary)',
                    }}
                  >
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th
                  style={{
                    padding: '8px',
                    borderBottom: '2px solid var(--vkui--color_separator_primary)',
                    backgroundColor: 'var(--vkui--color_background_secondary)',
                    textAlign: 'left',
                    fontWeight: 'bold',
                  }}
                >
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid var(--vkui--color_separator_primary)',
                  }}
                >
                  {children}
                </td>
              ),
              // Стилизация кода
              code: ({ inline, children }: any) =>
                inline ? (
                  <code
                    style={{
                      backgroundColor: 'var(--vkui--color_background_secondary)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.9em',
                    }}
                  >
                    {children}
                  </code>
                ) : (
                  <pre
                    style={{
                      backgroundColor: 'var(--vkui--color_background_secondary)',
                      padding: '12px',
                      borderRadius: '8px',
                      overflow: 'auto',
                      margin: '12px 0',
                    }}
                  >
                    <code>{children}</code>
                  </pre>
                ),
              // Стилизация списков
              ul: ({ children }) => (
                <ul style={{ paddingLeft: '24px', margin: '8px 0' }}>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol style={{ paddingLeft: '24px', margin: '8px 0' }}>{children}</ol>
              ),
              li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
              // Стилизация цитат
              blockquote: ({ children }) => (
                <blockquote
                  style={{
                    borderLeft: '4px solid var(--vkui--color_accent_blue)',
                    paddingLeft: '16px',
                    margin: '16px 0',
                    fontStyle: 'italic',
                    color: 'var(--vkui--color_text_secondary)',
                  }}
                >
                  {children}
                </blockquote>
              ),
              // Горизонтальная линия
              hr: () => (
                <hr
                  style={{
                    border: 'none',
                    borderTop: '1px solid var(--vkui--color_separator_primary)',
                    margin: '24px 0',
                  }}
                />
              ),
            }}
          >
            {getFilteredContent()}
          </ReactMarkdown>
        </Div>
      </Group>

      <style>{`
        .markdown-content h1 {
          font-size: 28px;
          font-weight: bold;
          color: var(--vkui--color_text_primary);
        }
        .markdown-content h2 {
          font-size: 24px;
          font-weight: bold;
          color: var(--vkui--color_text_primary);
        }
        .markdown-content h3 {
          font-size: 20px;
          font-weight: 600;
          color: var(--vkui--color_text_primary);
        }
        .markdown-content h4 {
          font-size: 18px;
          font-weight: 600;
          color: var(--vkui--color_text_primary);
        }
        .markdown-content h5 {
          font-size: 16px;
          font-weight: 600;
          color: var(--vkui--color_text_secondary);
        }
        .markdown-content h6 {
          font-size: 14px;
          font-weight: 600;
          color: var(--vkui--color_text_secondary);
        }
        .markdown-content p {
          margin: 12px 0;
        }
        .markdown-content a {
          color: var(--vkui--color_accent_blue);
          text-decoration: none;
        }
        .markdown-content a:hover {
          text-decoration: underline;
        }
        .markdown-content strong {
          font-weight: bold;
        }
        .markdown-content em {
          font-style: italic;
        }
      `}</style>
    </Panel>
  );
};

