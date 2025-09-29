import React from 'react';
import ReactMarkdown from 'react-markdown';

export interface HandbookSection {
  id: string;
  title: string;
  icon: React.ReactElement;
  color: string;
  category: string;
  priority: number;
  content: {
    title: string;
    description: string;
    keyPoints: string[];
    detailedContent?: string;
    subsections?: HandbookSubsection[];
  };
}

export interface HandbookSubsection {
  id: string;
  title: string;
  content: string;
  subSubsections?: HandbookSubSubsection[];
}

export interface HandbookSubSubsection {
  id: string;
  title: string;
  content: string;
}

export interface HandbookData {
  [key: string]: HandbookSection[];
}

type CategoryConfigKey = keyof typeof categoryConfig;

// Маппинг категорий на цвета и иконки
const categoryConfig = {
  'Основы мира': { color: '#4CAF50', icon: 'Icon24Info' },
  'Политика и власть': { color: '#F44336', icon: 'Icon24Users' },
  'Боевая система': { color: '#FF5722', icon: 'Icon24Fire' },
  'Экономика и торговля': { color: '#00BCD4', icon: 'Icon24MoneyCircle' },
  'Персонажи': { color: '#9C27B0', icon: 'Icon24User' },
  'Механики': { color: '#FF9800', icon: 'Icon24Game' },
  'Предметы': { color: '#795548', icon: 'Icon24Gift' },
  'Технические системы': { color: '#607D8B', icon: 'Icon24Settings' },
  'Общее': { color: '#9E9E9E', icon: 'Icon24Info' }
} as const;

export class MarkdownHandbookParser {
  private static async fetchMarkdownFile(filePath: string): Promise<string> {
    try {
      // Если это полный путь к файлу в public, используем его напрямую
      const fullPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
      console.log(`Fetching markdown file: ${fullPath}`);
      const response = await fetch(fullPath);
      console.log(`Response status: ${response.status} for ${filePath}`);

      if (!response.ok) {
        console.error(`Failed to fetch ${filePath}, status: ${response.status}`);
        throw new Error(`Failed to fetch ${filePath}`);
      }

      const content = await response.text();
      console.log(`Loaded ${filePath}, content length: ${content.length} characters`);
      return content;
    } catch (error) {
      console.error(`Error loading markdown file ${filePath}:`, error);
      return '';
    }
  }

  private static parseChapterStructure(markdownContent: string, fileName: string): HandbookSection[] {
    const lines = markdownContent.split('\n');
    console.log(`Parsing ${lines.length} lines from ${fileName}`);
    console.log('First 10 lines:', lines.slice(0, 10));
    const sections: HandbookSection[] = [];

    let currentSection: Partial<HandbookSection> | null = null;
    let currentSubsection: Partial<HandbookSubsection> | null = null;
    let contentBuffer: string[] = [];
    let subsectionContentBuffer: string[] = [];
    let chapterTitle = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Главный заголовок (H1) - название главы
      if (line.startsWith('# ')) {
        chapterTitle = line.substring(2).trim();

        // Сохраняем предыдущую секцию если она есть
        if (currentSection && contentBuffer.length > 0) {
          currentSection.content = this.parseSectionContent(contentBuffer, chapterTitle, currentSection.title || '');
          if (currentSection.title && currentSection.id) {
            sections.push(currentSection as HandbookSection);
          }
        }

        // Сохраняем предыдущую подсекцию если она есть
        if (currentSubsection && subsectionContentBuffer.length > 0) {
          currentSubsection.content = subsectionContentBuffer.join('\n');
          if (currentSection && currentSection.content && currentSection.content.subsections) {
            currentSection.content.subsections.push(currentSubsection as HandbookSubsection);
          }
        }

        contentBuffer = [];
        subsectionContentBuffer = [];
        currentSubsection = null;
      }
      // Заголовки секций (H2) - основные статьи
      else if (line.startsWith('## ')) {
        console.log(`Found H2 header: ${line}`);

        // Сохраняем предыдущую секцию если она есть
        if (currentSection && contentBuffer.length > 0) {
          console.log(`Saving previous section: ${currentSection.title}`);
          currentSection.content = this.parseSectionContent(contentBuffer, chapterTitle, currentSection.title || '');
          if (currentSection.title && currentSection.id) {
            sections.push(currentSection as HandbookSection);
          }
        }

        // Сохраняем предыдущую подсекцию если она есть
        if (currentSubsection && subsectionContentBuffer.length > 0) {
          currentSubsection.content = subsectionContentBuffer.join('\n');
          if (currentSection && currentSection.content && currentSection.content.subsections) {
            currentSection.content.subsections.push(currentSubsection as HandbookSubsection);
          }
        }

        // Начинаем новую секцию
        const title = line.substring(3).trim();
        console.log(`Creating new section: ${title}`);
        currentSection = {
          id: this.generateSlug(title),
          title: title,
          category: this.determineSectionCategory(title),
          priority: sections.length,
          content: {
            title: '',
            description: '',
            keyPoints: [],
            subsections: []
          }
        };
        contentBuffer = [line];
        subsectionContentBuffer = [];
        currentSubsection = null;
      }
      // Подзаголовки (H3) - подразделы
      else if (line.startsWith('### ')) {
        console.log(`Found H3 header: ${line}`);

        // Сохраняем предыдущую подсекцию если она есть
        if (currentSubsection && subsectionContentBuffer.length > 0) {
          currentSubsection.content = subsectionContentBuffer.join('\n');
          if (currentSection && currentSection.content && currentSection.content.subsections) {
            currentSection.content.subsections.push(currentSubsection as HandbookSubsection);
          }
        }

        // Начинаем новую подсекцию
        const title = line.substring(4).trim();
        currentSubsection = {
          id: this.generateSlug(title),
          title: title,
          content: '',
          subSubsections: []
        };
        subsectionContentBuffer = [line];
      }
      // Под-подзаголовки (H4) - под-подразделы
      else if (line.startsWith('#### ')) {
        subsectionContentBuffer.push(line);
      }
      // Обычный контент
      else if (line.length > 0) {
        contentBuffer.push(line);
        if (currentSubsection) {
          subsectionContentBuffer.push(line);
        }
      }
    }

    // Сохраняем последнюю секцию
    if (currentSection && contentBuffer.length > 0) {
      console.log(`Saving final section: ${currentSection.title}`);
      currentSection.content = this.parseSectionContent(contentBuffer, chapterTitle, currentSection.title || '');
      if (currentSection.title && currentSection.id) {
        sections.push(currentSection as HandbookSection);
      }
    }

    // Сохраняем последнюю подсекцию
    if (currentSubsection && subsectionContentBuffer.length > 0) {
      currentSubsection.content = subsectionContentBuffer.join('\n');
      if (currentSection && currentSection.content && currentSection.content.subsections) {
        currentSection.content.subsections.push(currentSubsection as HandbookSubsection);
      }
    }

    console.log(`Parsing complete. Total sections: ${sections.length}`);
    return sections;
  }

  private static parseSectionContent(contentLines: string[], chapterTitle: string, sectionTitle: string): HandbookSection['content'] {
    // Находим описание - это первая не-заголовочная строка после H2
    const descriptionLines = contentLines.filter(line =>
      !line.startsWith('#') &&
      !line.startsWith('*') &&
      line.length > 20 &&
      !line.startsWith('-') &&
      !line.startsWith('|') &&
      !line.startsWith('---')
    );

    const description = descriptionLines.length > 0
      ? descriptionLines[0].replace(/\*\*/g, '').trim()
      : `Подробная информация о ${sectionTitle}`;

    // Находим ключевые моменты
    const keyPoints = contentLines
      .filter(line => line.startsWith('- ') || line.startsWith('* '))
      .map(line => {
        // Убираем маркеры списков и жирное выделение
        let point = line.substring(2).trim();
        point = point.replace(/\*\*/g, '');
        point = point.replace(/^- /, '');
        return point;
      })
      .filter(point => point.length > 0)
      .slice(0, 5); // Ограничиваем до 5 ключевых пунктов

    // Проверяем, содержит ли контент таблицы (строки с |)
    const hasTables = contentLines.some(line => line.includes('|') && !line.startsWith('|') && !line.startsWith('*'));

    console.log(`Section "${sectionTitle}" has tables: ${hasTables}`);
    console.log(`Content length: ${contentLines.join('\n').length} characters`);

    return {
      title: '',
      description,
      keyPoints,
      detailedContent: contentLines.join('\n'),
      subsections: []
    };
  }

  private static extractCategory(fileName: string): CategoryConfigKey {
    // Поскольку у нас единый файл, определяем категории по содержимому
    if (fileName.includes('Руководство_по_Миру')) {
      return 'Общее'; // Основная категория для всех секций
    }
    return 'Общее';
  }

  private static determineSectionCategory(sectionTitle: string): CategoryConfigKey {
    const title = sectionTitle.toLowerCase();

    if (title.includes('мир') || title.includes('основа') || title.includes('существа') || title.includes('проводники')) {
      return 'Основы мира';
    }
    if (title.includes('острова') || title.includes('фракции') || title.includes('общество')) {
      return 'Политика и власть';
    }
    if (title.includes('контракт') || title.includes('аур') || title.includes('механик')) {
      return 'Механики';
    }
    if (title.includes('боевая') || title.includes('систем')) {
      return 'Боевая система';
    }
    if (title.includes('синки') || title.includes('предмет')) {
      return 'Предметы';
    }
    if (title.includes('техническ') || title.includes('аураномик')) {
      return 'Технические системы';
    }

    return 'Общее';
  }

  private static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }

  static async loadAllChapters(): Promise<HandbookData> {
    const handbookData: HandbookData = {};

    try {
      console.log('Loading main handbook file: Руководство_по_Миру.md');
      const markdown = await this.fetchMarkdownFile('Руководство_по_Миру.md');
      const sections = this.parseChapterStructure(markdown, 'Руководство_по_Миру.md');

      console.log(`Parsed ${sections.length} main sections:`, sections.map(s => `${s.title} (${s.category})`));

      // Группируем секции по категориям
      sections.forEach(section => {
        if (!handbookData[section.category]) {
          handbookData[section.category] = [];
        }
        handbookData[section.category].push(section);
      });

      // Добавляем иконки и цвета из конфига
      Object.entries(handbookData).forEach(([category, sections]) => {
        const config = categoryConfig[category as CategoryConfigKey];
        sections.forEach(section => {
          section.color = config.color;
          section.icon = React.createElement('div', { style: { color: config.color } }, '📚');
        });
      });

      console.log('Final handbook structure:', Object.keys(handbookData).map(cat => `${cat}: ${handbookData[cat].length} sections`));
    } catch (error) {
      console.error('Error loading handbook:', error);
    }

    return handbookData;
  }

  static async loadChapter(chapterFile: string): Promise<HandbookSection[]> {
    const markdown = await this.fetchMarkdownFile(chapterFile);
    const sections = this.parseChapterStructure(markdown, chapterFile);

    const category = this.extractCategory(chapterFile);
    const config = categoryConfig[category];

    sections.forEach(section => {
      section.color = config.color;
      section.category = category;
      section.icon = React.createElement('div', { style: { color: config.color } }, '📚');
    });

    return sections;
  }

  static parseMarkdownToReact(content: string): React.ReactElement {
    return React.createElement(ReactMarkdown, {
      children: content,
      components: {
        h1: ({ children }) => React.createElement('h1', {
          style: {
            fontSize: '2.2em',
            marginTop: '1.5em',
            marginBottom: '0.8em',
            color: 'var(--vkui--color_text_primary)',
            fontWeight: '700'
          }
        }, children),
        h2: ({ children }) => React.createElement('h2', {
          style: {
            fontSize: '1.8em',
            marginTop: '1.4em',
            marginBottom: '0.7em',
            color: 'var(--vkui--color_text_primary)',
            fontWeight: '600'
          }
        }, children),
        h3: ({ children }) => React.createElement('h3', {
          style: {
            fontSize: '1.4em',
            marginTop: '1.2em',
            marginBottom: '0.6em',
            color: 'var(--vkui--color_text_primary)',
            fontWeight: '600'
          }
        }, children),
        p: ({ children }) => React.createElement('p', {
          style: {
            lineHeight: '1.6',
            marginBottom: '1.2em',
            fontSize: '16px',
            color: 'var(--vkui--color_text_primary)'
          }
        }, children),
        ul: ({ children }) => React.createElement('ul', {
          style: {
            paddingLeft: '1.5em',
            marginBottom: '1em',
            listStyleType: 'disc'
          }
        }, children),
        li: ({ children }) => React.createElement('li', {
          style: {
            marginBottom: '0.6em',
            lineHeight: '1.5',
            color: 'var(--vkui--color_text_primary)'
          }
        }, children),
        strong: ({ children }) => React.createElement('strong', { style: { fontWeight: 'bold' } }, children),
        em: ({ children }) => React.createElement('em', { style: { fontStyle: 'italic' } }, children),
        table: ({ children }) => React.createElement('div', {
          style: {
            overflowX: 'auto',
            margin: '1.5em 0',
            borderRadius: '12px',
            border: '2px solid var(--vkui--color_field_border)',
            backgroundColor: 'var(--vkui--color_background_secondary)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--vkui--color_field_border) transparent'
          }
        }, React.createElement('table', {
          style: {
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '500px',
            fontSize: '13px',
            lineHeight: '1.4'
          }
        }, children)),
        th: ({ children }) => React.createElement('th', {
          style: {
            border: '1px solid var(--vkui--color_field_border)',
            padding: '12px 6px',
            textAlign: 'center',
            backgroundColor: 'var(--vkui--color_background_tertiary)',
            fontWeight: '600',
            color: 'var(--vkui--color_text_primary)',
            whiteSpace: 'nowrap',
            position: 'sticky',
            top: '0',
            zIndex: 10,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            fontSize: '12px'
          }
        }, children),
        td: ({ children }) => React.createElement('td', {
          style: {
            border: '1px solid var(--vkui--color_field_border)',
            padding: '12px 6px',
            textAlign: 'center',
            color: 'var(--vkui--color_text_primary)',
            verticalAlign: 'middle',
            wordWrap: 'break-word',
            wordBreak: 'break-word',
            fontSize: '12px'
          }
        }, children),
        tr: ({ children }) => React.createElement('tr', {
          style: {
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e: React.MouseEvent<HTMLTableRowElement>) => {
            e.currentTarget.style.backgroundColor = 'var(--vkui--color_background_tertiary)';
            e.currentTarget.style.transform = 'scale(1.01)';
          },
          onMouseLeave: (e: React.MouseEvent<HTMLTableRowElement>) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }, children),
        blockquote: ({ children }) => React.createElement('blockquote', {
          style: {
            borderLeft: '5px solid var(--vkui--color_accent)',
            padding: '16px 20px',
            margin: '20px 0',
            backgroundColor: 'var(--vkui--color_background_tertiary)',
            borderRadius: '0 12px 12px 0',
            fontStyle: 'italic',
            color: 'var(--vkui--color_text_primary)',
            fontSize: '15px',
            lineHeight: '1.5',
            position: 'relative'
          }
        }, children),
        code: ({ children }) => React.createElement('code', {
          style: {
            backgroundColor: 'var(--vkui--color_background_tertiary)',
            padding: '3px 8px',
            borderRadius: '6px',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace',
            fontSize: '14px',
            color: 'var(--vkui--color_accent)',
            border: '1px solid var(--vkui--color_field_border)'
          }
        }, children),
        pre: ({ children }) => React.createElement('pre', {
          style: {
            backgroundColor: 'var(--vkui--color_background_tertiary)',
            padding: '20px',
            borderRadius: '12px',
            overflow: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            margin: '20px 0',
            border: '2px solid var(--vkui--color_field_border)'
          }
        }, children),
        hr: () => React.createElement('hr', {
          style: {
            margin: '2.5em 0',
            border: 'none',
            borderTop: '3px solid var(--vkui--color_field_border)',
            backgroundColor: 'transparent',
            position: 'relative'
          }
        }),
        a: ({ children, href }) => React.createElement('a', {
          href: href,
          style: {
            color: 'var(--vkui--color_accent)',
            textDecoration: 'none',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.currentTarget.style.textDecoration = 'underline';
            e.currentTarget.style.color = 'var(--vkui--color_accent_hover)';
          },
          onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => {
            e.currentTarget.style.textDecoration = 'none';
            e.currentTarget.style.color = 'var(--vkui--color_accent)';
          }
        }, children),
        img: ({ src, alt }) => React.createElement('div', {
          style: {
            display: 'flex',
            justifyContent: 'center',
            margin: '20px 0'
          }
        }, React.createElement('img', {
          src: src,
          alt: alt,
          style: {
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--vkui--color_field_border)'
          }
        })),
      }
    });
  }
}
