import React, { useState, useEffect, useMemo } from 'react';
import {
  Panel,
  PanelHeader,
  SplitLayout,
  SplitCol,
  Group,
  Cell,
  RichCell,
  Text,
  Search,
  PanelHeaderBack,
  usePlatform,
  Platform,
  View,
  ScreenSpinner,
  AdaptivityProvider,
  AppRoot,
  ConfigProvider,
} from '@vkontakte/vkui';
import { handbookData, Chapter } from '../handbook-data';
import Markdown from 'react-markdown';
import { Icon28ArticleOutline } from '@vkontakte/icons';

const STORAGE_KEY = 'handbook_last_section';

export const Handbook = () => {
  const platform = usePlatform();
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(platform !== Platform.VKCOM);

  useEffect(() => {
    const savedSectionId = localStorage.getItem(STORAGE_KEY);
    if (savedSectionId) {
      const chapter = handbookData.find(c => c.sections.some(s => s.id === savedSectionId));
      if (chapter) {
        setActiveChapterId(chapter.id);
        setActiveSectionId(savedSectionId);
      }
    } else if (handbookData.length > 0 && handbookData[0].sections.length > 0) {
      setActiveChapterId(handbookData[0].id);
      setActiveSectionId(handbookData[0].sections[0].id);
    }
  }, []);

  useEffect(() => {
    if (activeSectionId) {
      localStorage.setItem(STORAGE_KEY, activeSectionId);
    }
  }, [activeSectionId]);

  const filteredData = useMemo(() => {
    if (!searchQuery) {
      return handbookData;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return handbookData
      .map(chapter => {
        const filteredSections = chapter.sections.filter(
          section =>
            section.title.toLowerCase().includes(lowerCaseQuery) ||
            section.content.toLowerCase().includes(lowerCaseQuery)
        );
        return { ...chapter, sections: filteredSections };
      })
      .filter(chapter => chapter.sections.length > 0);
  }, [searchQuery]);

  const handleSectionClick = (chapterId: string, sectionId: string) => {
    setActiveChapterId(chapterId);
    setActiveSectionId(sectionId);
    if (platform !== Platform.VKCOM) {
      setIsMenuOpen(false);
    }
  };

  const activeSection = useMemo(() => {
    if (!activeChapterId || !activeSectionId) return null;
    const chapter = handbookData.find(c => c.id === activeChapterId);
    return chapter?.sections.find(s => s.id === activeSectionId) || null;
  }, [activeChapterId, activeSectionId]);


  const menu = (
    <SplitCol width="100%" maxWidth="350px" spaced={platform !== Platform.VKCOM}>
      <Panel id="menu">
        <PanelHeader>Справочник</PanelHeader>
        <Search value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        {filteredData.map(chapter => (
          <Group key={chapter.id} header={<Text weight="1">{chapter.title}</Text>}>
            {chapter.sections.map(section => (
              <Cell
                key={section.id}
                onClick={() => handleSectionClick(chapter.id, section.id)}
                disabled={section.id === activeSectionId}
                before={<Icon28ArticleOutline />}
                style={section.id === activeSectionId ? { backgroundColor: 'var(--vkui--color_background_secondary)' } : {}}
              >
                {section.title}
              </Cell>
            ))}
          </Group>
        ))}
      </Panel>
    </SplitCol>
  );

  const content = (
    <SplitCol spaced>
      <View activePanel="content">
        <Panel id="content">
          <PanelHeader
            before={
              platform !== Platform.VKCOM && (
                <PanelHeaderBack onClick={() => setIsMenuOpen(true)} />
              )
            }
          >
            {activeSection?.title || 'Справочник'}
          </PanelHeader>
          <Group>
            {activeSection ? (
              <div style={{ padding: '12px' }}>
                <Markdown>{activeSection.content}</Markdown>
              </div>
            ) : (
              <Text style={{ padding: '12px' }}>Выберите раздел для чтения.</Text>
            )}
          </Group>
        </Panel>
      </View>
    </SplitCol>
  );

  return (
    <ConfigProvider>
      <AdaptivityProvider>
        <AppRoot>
            <SplitLayout>
              {isMenuOpen && menu}
              {!isMenuOpen || platform === Platform.VKCOM ? content : null}
            </SplitLayout>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
};

export default Handbook;
