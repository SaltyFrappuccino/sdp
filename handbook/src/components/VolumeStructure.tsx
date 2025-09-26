import React, { useState } from 'react';
import styles from './VolumeStructure.module.css';
import BookmarkButton from './BookmarkButton';
import { Volume, Chapter, Section, SubSection } from '../data/volumesData';

interface VolumeStructureProps {
  volumes: Volume[];
}

const VolumeStructure: React.FC<VolumeStructureProps> = ({ volumes }) => {
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedContent, setSelectedContent] = useState<{
    type: 'section' | 'subsection';
    content: string;
    title: string;
    sectionId: string;
  } | null>(null);

  const toggleVolume = (volumeId: string) => {
    const newExpanded = new Set(expandedVolumes);
    if (newExpanded.has(volumeId)) {
      newExpanded.delete(volumeId);
    } else {
      newExpanded.add(volumeId);
    }
    setExpandedVolumes(newExpanded);
  };

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleSectionClick = (section: Section) => {
    setSelectedContent({
      type: 'section',
      content: section.content,
      title: section.title,
      sectionId: section.id
    });
  };

  const handleSubSectionClick = (subsection: SubSection, sectionTitle: string) => {
    setSelectedContent({
      type: 'subsection',
      content: subsection.content,
      title: subsection.title,
      sectionId: subsection.id
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>Структура Руководства</h2>
        <div className={styles.volumesList}>
          {volumes.map((volume) => (
            <div key={volume.id} className={styles.volumeItem}>
              <div 
                className={styles.volumeHeader}
                onClick={() => toggleVolume(volume.id)}
              >
                <span className={styles.expandIcon}>
                  {expandedVolumes.has(volume.id) ? '▼' : '▶'}
                </span>
                <span className={styles.volumeTitle}>{volume.title}</span>
              </div>
              
              {expandedVolumes.has(volume.id) && (
                <div className={styles.chaptersList}>
                  {volume.chapters.map((chapter) => (
                    <div key={chapter.id} className={styles.chapterItem}>
                      <div 
                        className={styles.chapterHeader}
                        onClick={() => toggleChapter(chapter.id)}
                      >
                        <span className={styles.expandIcon}>
                          {expandedChapters.has(chapter.id) ? '▼' : '▶'}
                        </span>
                        <span className={styles.chapterTitle}>{chapter.title}</span>
                      </div>
                      
                      {expandedChapters.has(chapter.id) && (
                        <div className={styles.sectionsList}>
                          {chapter.sections.map((section) => (
                            <div key={section.id} className={styles.sectionItem}>
                              <div 
                                className={styles.sectionHeader}
                                onClick={() => toggleSection(section.id)}
                              >
                                <span className={styles.expandIcon}>
                                  {expandedSections.has(section.id) ? '▼' : '▶'}
                                </span>
                                <span 
                                  className={styles.sectionTitle}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSectionClick(section);
                                  }}
                                >
                                  {section.title}
                                </span>
                              </div>
                              
                              {expandedSections.has(section.id) && section.subsections && (
                                <div className={styles.subsectionsList}>
                                  {section.subsections.map((subsection) => (
                                    <div 
                                      key={subsection.id}
                                      className={styles.subsectionItem}
                                      onClick={() => handleSubSectionClick(subsection, section.title)}
                                    >
                                      {subsection.title}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className={styles.content}>
        {selectedContent ? (
          <div className={styles.contentSection}>
            <div className={styles.contentHeader}>
              <h2 className={styles.contentTitle}>
                {selectedContent.title}
                <BookmarkButton 
                  section="volumes" 
                  title={selectedContent.title} 
                />
              </h2>
            </div>
            <div className={styles.contentText}>
              {selectedContent.content.split('\n\n').map((paragraph, index) => (
                <p key={index} className={styles.paragraph}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <h3>Выберите раздел</h3>
            <p>Нажмите на любой раздел в левой панели, чтобы прочитать его содержимое</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolumeStructure;
