import React, { useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  Search,
  PanelHeaderBack,
  Spinner,
  SplitLayout,
  SplitCol,
  Cell,
  Header,
  Text,
  Button
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { MarkdownHandbookParser, HandbookData, HandbookChapter, HandbookArticle } from '../utils/markdownHandbookParser';

interface HandbookProps {
  id: string;
}

export const Handbook: React.FC<HandbookProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [searchQuery, setSearchQuery] = useState('');
  const [handbookData, setHandbookData] = useState<HandbookData>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<string | null>(null);

  useEffect(() => {
    const loadHandbookData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await MarkdownHandbookParser.loadHandbook();
        setHandbookData(data);
        if (data.length > 0) {
          setActiveChapter(data[0].id);
          if (data[0].articles.length > 0) {
            setActiveArticle(data[0].articles[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading handbook data:', err);
        setError('Ошибка загрузки данных справочника');
      } finally {
        setIsLoading(false);
      }
    };

    loadHandbookData();
  }, []);

  const handleChapterClick = (chapterId: string) => {
    setActiveChapter(chapterId);
    const chapter = handbookData.find(c => c.id === chapterId);
    if (chapter && chapter.articles.length > 0) {
      setActiveArticle(chapter.articles[0].id);
    } else {
      setActiveArticle(null);
    }
  };
  
  const filteredData = searchQuery
  ? handbookData.map(chapter => {
      const filteredArticles = chapter.articles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { ...chapter, articles: filteredArticles };
    }).filter(chapter => chapter.articles.length > 0)
  : handbookData;


  const renderArticleContent = (article: HandbookArticle) => {
    return (
      <div style={{ padding: '12px' }}>
        <Header>{article.title}</Header>
        {MarkdownHandbookParser.parseMarkdownToReact(article.content)}
      </div>
    );
  };

  const currentChapter = handbookData.find(c => c.id === activeChapter);
  const currentArticle = currentChapter?.articles.find(a => a.id === activeArticle);

  if (isLoading) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
          Справочник
        </PanelHeader>
        <Group>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <Spinner size="l" />
          </div>
        </Group>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
          Справочник
        </PanelHeader>
        <Group>
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--vkui--color_text_negative)' }}>
            <Text>{error}</Text>
            <Button onClick={() => window.location.reload()} style={{ marginTop: '16px' }}>
              Попробовать снова
            </Button>
          </div>
        </Group>
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
          style={{ marginBottom: '16px' }}
        />
      </Group>
      <SplitLayout style={{ justifyContent: 'center' }}>
        <SplitCol fixed width={280} maxWidth={280}>
          <Group>
            {filteredData.map((chapter) => (
              <div key={chapter.id}>
                <Header>{chapter.title}</Header>
                {chapter.articles.map((article) => (
                  <Cell
                    key={article.id}
                    onClick={() => {
                      setActiveChapter(chapter.id);
                      setActiveArticle(article.id);
                    }}
                    selected={activeArticle === article.id}
                  >
                    {article.title}
                  </Cell>
                ))}
              </div>
            ))}
          </Group>
        </SplitCol>
        <SplitCol>
          <Group>
            {currentChapter && (
              <div style={{ padding: '12px' }}>
                <Header>{currentChapter.title}</Header>
                {MarkdownHandbookParser.parseMarkdownToReact(currentChapter.contentBeforeArticles)}
              </div>
            )}
            {currentArticle && renderArticleContent(currentArticle)}
          </Group>
        </SplitCol>
      </SplitLayout>
    </Panel>
  );
};