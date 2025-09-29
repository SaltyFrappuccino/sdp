import React, { useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  Card,
  CardGrid,
  Header,
  Text,
  Button,
  Search,
  PanelHeaderBack,
  Spinner
} from '@vkontakte/vkui';
import { Icon24ChevronRight } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { MarkdownHandbookParser, HandbookData, HandbookSection, HandbookSubsection } from '../utils/markdownHandbookParser';

interface HandbookProps {
  id: string;
}

export const Handbook: React.FC<HandbookProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [handbookData, setHandbookData] = useState<HandbookData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHandbookData = async () => {
      try {
        console.log('Starting to load handbook data...');
        setIsLoading(true);
        setError(null);
        const data = await MarkdownHandbookParser.loadAllChapters();
        console.log('Handbook data loaded successfully:', data);
        setHandbookData(data);
      } catch (err) {
        console.error('Error loading handbook data:', err);
        setError('Ошибка загрузки данных справочника');
      } finally {
        setIsLoading(false);
      }
    };

    loadHandbookData();
  }, []);

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

  // Получаем все секции из загруженных данных
  const allSections = Object.values(handbookData).flat();
  console.log('All sections:', allSections.length, allSections.map(s => `${s.title} (${s.category})`));

  const filteredSections = allSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  console.log('Filtered sections:', filteredSections.length);

  // Группируем разделы по категориям и сортируем по приоритету
  const groupedSections = filteredSections.reduce((groups, section) => {
    const category = section.category || 'Другое';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(section);
    return groups;
  }, {} as Record<string, typeof allSections>);

  // Сортируем разделы внутри каждой категории по приоритету
  Object.keys(groupedSections).forEach(category => {
    groupedSections[category].sort((a, b) => (a.priority || 999) - (b.priority || 999));
  });

  // Порядок категорий
  const categoryOrder = [
    'Основы мира',
    'Политика и власть',
    'Персонажи',
    'Механики',
    'Боевая система',
    'Предметы',
    'Технические системы'
  ];

  const renderMarkdownContent = (content: string) => {
    return MarkdownHandbookParser.parseMarkdownToReact(content);
  };

  const renderSectionContent = (section: typeof allSections[0]) => (
    <Card key={section.id} style={{ marginBottom: '16px' }}>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{
            color: section.color,
            marginRight: '12px',
            fontSize: '24px'
          }}>
            {section.icon}
          </div>
          <div>
            <Header style={{ color: section.color, margin: 0 }}>
              {section.content.title}
            </Header>
          </div>
        </div>

        <Text style={{ marginBottom: '16px', lineHeight: '1.5' }}>
          {section.content.description}
        </Text>

        <div>
          <Header style={{ marginBottom: '8px' }}>
            Ключевые моменты:
          </Header>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {section.content.keyPoints.map((point, index) => (
              <li key={index} style={{ marginBottom: '8px', lineHeight: '1.4' }}>
                <Text>{point}</Text>
              </li>
            ))}
          </ul>
        </div>

        {section.content.subsections && section.content.subsections.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <Header style={{ marginBottom: '12px' }}>
              Подразделы:
            </Header>
            <div>
              {section.content.subsections.map((subsection, index) => (
                <Card key={subsection.id} style={{ marginBottom: '12px' }}>
                  <div style={{ padding: '12px' }}>
                    <Header style={{ marginBottom: '8px', fontSize: '16px' }}>
                      {subsection.title}
                    </Header>
                    <div style={{
                      backgroundColor: 'var(--vkui--color_background_secondary)',
                      padding: '20px',
                      borderRadius: '12px',
                      border: `2px solid ${section.color}15`,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                      overflow: 'hidden'
                    }}>
                      {renderMarkdownContent(subsection.content)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {section.content.detailedContent && (
          <div style={{ marginTop: '20px' }}>
            <Header style={{ marginBottom: '12px' }}>
              Подробная информация:
            </Header>
            <div style={{
              backgroundColor: 'var(--vkui--color_background_secondary)',
              padding: '24px',
              borderRadius: '12px',
              border: `2px solid ${section.color}20`,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden'
            }}>
              {renderMarkdownContent(section.content.detailedContent)}
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
        Справочник
      </PanelHeader>

      <Group>
        <div style={{ padding: '16px' }}>
          <Search
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по справочнику..."
            style={{ marginBottom: '16px' }}
          />

          {searchQuery && (
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--vkui--color_background_secondary)', borderRadius: '8px' }}>
              <Text>Найдено разделов: {filteredSections.length}</Text>
            </div>
          )}

          {selectedSection ? (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <Button
                  mode="tertiary"
                  onClick={() => setSelectedSection(null)}
                  before={<Icon24ChevronRight style={{ transform: 'rotate(180deg)' }} />}
                >
                  Назад к разделам
                </Button>
              </div>
              {renderSectionContent(allSections.find(s => s.id === selectedSection)!)}
            </div>
          ) : (
            <div>
              {categoryOrder.map(category => {
                const categorySections = groupedSections[category];
                if (!categorySections || categorySections.length === 0) return null;

                return (
                  <div key={category} style={{ marginBottom: '32px' }}>
                    <Header style={{
                      marginBottom: '16px',
                      padding: '8px 16px',
                      backgroundColor: 'var(--vkui--color_background_secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--vkui--color_field_border)'
                    }}>
                      {category}
                    </Header>
                    <CardGrid size="s">
                      {categorySections.map((section) => (
                        <Card
                          key={section.id}
                          style={{
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            border: `2px solid ${section.color}20`,
                            height: '180px',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                          onClick={() => setSelectedSection(section.id)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${section.color}30`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{
                            padding: '16px',
                            textAlign: 'center',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                          }}>
                            <div>
                              <div style={{
                                color: section.color,
                                fontSize: '32px',
                                marginBottom: '12px'
                              }}>
                                {section.icon}
                              </div>
                              <Header style={{ color: section.color, margin: 0, fontSize: '16px' }}>
                                {section.title}
                              </Header>
                            </div>
                            <Text style={{
                              marginTop: '8px',
                              fontSize: '13px',
                              opacity: 0.8,
                              lineHeight: '1.3',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {section.content.description.substring(0, 120)}...
                            </Text>
                          </div>
                        </Card>
                      ))}
                    </CardGrid>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Group>
    </Panel>
  );
};