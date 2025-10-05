import React from 'react';
import ReactMarkdown from 'react-markdown';

export interface HandbookArticle {
  id: string;
  title: string;
  content: string;
  level: number;
}

export interface HandbookChapter {
  id: string;
  title: string;
  contentBeforeArticles: string;
  articles: HandbookArticle[];
}

export type HandbookData = HandbookChapter[];

export class MarkdownHandbookParser {
  private static async fetchMarkdownFile(filePath: string): Promise<string> {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error("Error fetching markdown file:", error);
      throw error;
    }
  }

  private static generateSlug(text: string): string {
    const translit = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
      'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
      'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c',
      'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
      'я': 'ya', ' ': '-', '_': '-', '(': '', ')': '', '[': '', ']': '', '/': '-', '\'': '', '"': ''
    };
    return text.toLowerCase()
      // @ts-ignore
      .replace(/[а-яё]/g, (char) => translit[char] || '')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  public static async loadHandbook(): Promise<HandbookData> {
    const markdownContent = await this.fetchMarkdownFile('/Руководство_по_Миру.md');
    return this.parseMarkdown(markdownContent);
  }

  private static parseMarkdown(markdownContent: string): HandbookData {
    const lines = markdownContent.split(/\r?\n/);
    const handbookData: HandbookData = [];

    let currentChapter: HandbookChapter | null = null;
    let currentArticle: { title: string; level: number; content: string[] } | null = null;

    const commitArticle = () => {
      if (currentArticle && currentChapter) {
        currentChapter.articles.push({
          id: `${currentChapter.id}-${this.generateSlug(currentArticle.title)}`,
          title: currentArticle.title,
          level: currentArticle.level,
          content: currentArticle.content.join('\n').trim(),
        });
      }
      currentArticle = null;
    };

    for (const line of lines) {
      const h2Match = line.match(/^## (.*)/);
      if (h2Match) {
        commitArticle();
        if (currentChapter) {
          handbookData.push(currentChapter);
        }
        
        const title = h2Match[1].trim();
        if (title.includes('Содержание') || title.includes('Заключение')) {
            currentChapter = null;
            continue;
        }

        currentChapter = {
          id: this.generateSlug(title),
          title,
          contentBeforeArticles: '',
          articles: [],
        };
        continue;
      }
      
      if (!currentChapter) continue;

      const h3Match = line.match(/^### (.*)/);
      const h4Match = line.match(/^#### (.*)/);
      const h5Match = line.match(/^##### (.*)/);
      const headingMatch = h3Match || h4Match || h5Match;

      if (headingMatch) {
        commitArticle();
        const level = h3Match ? 3 : (h4Match ? 4 : 5);
        const title = headingMatch[1].trim();
        currentArticle = {
          title,
          level,
          content: [],
        };
        continue;
      }

      if (currentArticle) {
        currentArticle.content.push(line);
      } else {
        currentChapter.contentBeforeArticles += line + '\n';
      }
    }

    commitArticle();
    if (currentChapter) {
        currentChapter.contentBeforeArticles = currentChapter.contentBeforeArticles.trim();
        handbookData.push(currentChapter);
    }
    
    return handbookData;
  }
  
  static parseMarkdownToReact(content: string): React.ReactElement {
    return React.createElement(ReactMarkdown, { children: content });
  }
}
