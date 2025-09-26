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
  const [selectedVolume, setSelectedVolume] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSubSection, setSelectedSubSection] = useState<string | null>(null);

  const toggleVolume = (volumeId: string) => {
    const newExpanded = new Set(expandedVolumes);
    if (newExpanded.has(volumeId)) {
      newExpanded.delete(volumeId);
      setSelectedVolume(null);
      setSelectedChapter(null);
      setSelectedSection(null);
      setSelectedSubSection(null);
    } else {
      newExpanded.add(volumeId);
    }
    setExpandedVolumes(newExpanded);
  };

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
      setSelectedChapter(null);
      setSelectedSection(null);
      setSelectedSubSection(null);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
      setSelectedSection(null);
      setSelectedSubSection(null);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleVolumeSelect = (volumeId: string) => {
    setSelectedVolume(volumeId);
    setSelectedChapter(null);
    setSelectedSection(null);
    setSelectedSubSection(null);
    toggleVolume(volumeId);
  };

  const handleChapterSelect = (chapterId: string) => {
    setSelectedChapter(chapterId);
    setSelectedSection(null);
    setSelectedSubSection(null);
    toggleChapter(chapterId);
  };

  const handleSectionSelect = (sectionId: string) => {
    setSelectedSection(sectionId);
    setSelectedSubSection(null);
    toggleSection(sectionId);
  };

  const handleSubSectionSelect = (subsectionId: string) => {
    setSelectedSubSection(subsectionId);
  };

  const getSelectedContent = () => {
    if (!selectedVolume) return null;

    const volume = volumes.find(v => v.id === selectedVolume);
    if (!volume) return null;

    if (!selectedChapter) {
      return (
        <div className={styles.contentSection}>
          <div className={styles.contentHeader}>
            <h1 className={styles.contentTitle}>{volume.title}</h1>
          </div>
          <div className={styles.contentText}>
            <p className={styles.paragraph}>Выберите главу для просмотра содержимого.</p>
          </div>
        </div>
      );
    }

    const chapter = volume.chapters.find(c => c.id === selectedChapter);
    if (!chapter) return null;

    // Показываем содержимое главы, если секция не выбрана
    if (!selectedSection) {
      return (
        <div className={styles.contentSection}>
          <div className={styles.contentHeader}>
            <h1 className={styles.contentTitle}>{volume.title} - {chapter.title}</h1>
            <BookmarkButton section={`${volume.id}-${chapter.id}`} title={`${volume.title} - ${chapter.title}`} />
          </div>
          <div className={styles.contentText}>
            {chapter.sections.length === 0 ? (
              <p className={styles.paragraph}>В этой главе пока нет секций.</p>
            ) : (
              <div>
                <p className={styles.paragraph}>Выберите секцию для просмотра:</p>
                <ul className={styles.sectionsList}>
                  {chapter.sections.map((section) => (
                    <li key={section.id} className={styles.sectionLink}>
                      <button
                        onClick={() => handleSectionSelect(section.id)}
                        className={styles.sectionButton}
                      >
                        {section.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }

    const section = chapter.sections.find(s => s.id === selectedSection);
    if (!section) return null;

    if (!selectedSubSection) {
      return (
        <div className={styles.contentSection}>
          <div className={styles.contentHeader}>
            <h1 className={styles.contentTitle}>{volume.title} - {chapter.title} - {section.title}</h1>
            <BookmarkButton section={`${volume.id}-${chapter.id}-${section.id}`} title={`${volume.title} - ${chapter.title} - ${section.title}`} />
          </div>
          <div className={styles.contentText}>
            {section.content.map((paragraph, idx) => (
              <p key={idx} className={styles.paragraph}>
                {paragraph}
              </p>
            ))}
            {section.subsections && section.subsections.length > 0 && (
              <div className={styles.subsectionsContainer}>
                <p className={styles.paragraph}>Выберите подсекцию для просмотра дополнительного содержимого:</p>
                <ul className={styles.subsectionsList}>
                  {section.subsections.map((subsection) => (
                    <li key={subsection.id} className={styles.subsectionLink}>
                      <button
                        onClick={() => handleSubSectionSelect(subsection.id)}
                        className={styles.subsectionButton}
                      >
                        {subsection.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={() => {
                setSelectedSection(null);
                setSelectedSubSection(null);
              }}
              className={styles.backButton}
            >
              ← Назад к главам
            </button>
          </div>
        </div>
      );
    }

    const subsection = section.subsections?.find(s => s.id === selectedSubSection);
    if (!subsection) return null;

    return (
      <div className={styles.contentSection}>
        <div className={styles.contentHeader}>
          <h1 className={styles.contentTitle}>{volume.title} - {chapter.title} - {section.title} - {subsection.title}</h1>
          <BookmarkButton section={`${volume.id}-${chapter.id}-${section.id}-${subsection.id}`} title={`${volume.title} - ${chapter.title} - ${section.title} - ${subsection.title}`} />
        </div>
        <div className={styles.contentText}>
          {subsection.content.map((paragraph, idx) => (
            <p key={idx} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}
          <button
            onClick={() => setSelectedSubSection(null)}
            className={styles.backButton}
          >
            ← Назад к секциям
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.navigationPanel}>
        <h2 className={styles.navigationTitle}>Навигация по Томам</h2>
        <div className={styles.volumesList}>
          {volumes.map((volume) => (
            <div key={volume.id} className={styles.volumeItem}>
              <div
                className={styles.volumeHeader}
                onClick={() => handleVolumeSelect(volume.id)}
              >
                <span className={styles.expandIcon}>
                  {expandedVolumes.has(volume.id) ? '−' : '+'}
                </span>
                <span className={styles.volumeTitle}>{volume.title}</span>
              </div>

              {expandedVolumes.has(volume.id) && (
                <div className={styles.chaptersList}>
                  {volume.chapters.map((chapter) => (
                    <div key={chapter.id} className={styles.chapterItem}>
                      <div
                        className={styles.chapterHeader}
                        onClick={() => handleChapterSelect(chapter.id)}
                      >
                        <span className={styles.expandIcon}>
                          {expandedChapters.has(chapter.id) ? '−' : '+'}
                        </span>
                        <span className={styles.chapterTitle}>{chapter.title}</span>
                      </div>

                      {expandedChapters.has(chapter.id) && (
                        <div className={styles.sectionsList}>
                          {chapter.sections.map((section) => (
                            <div key={section.id} className={styles.sectionItem}>
                              <div
                                className={styles.sectionHeader}
                                onClick={() => handleSectionSelect(section.id)}
                              >
                                <span className={styles.expandIcon}>
                                  {expandedSections.has(section.id) ? '−' : '+'}
                                </span>
                                <span className={styles.sectionTitle}>{section.title}</span>
                              </div>

                              {expandedSections.has(section.id) && (
                                <div className={styles.subsectionsList}>
                                  {section.subsections && section.subsections.map((subsection) => (
                                    <div
                                      key={subsection.id}
                                      className={styles.subsectionItem}
                                      onClick={() => handleSubSectionSelect(subsection.id)}
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
        {getSelectedContent() || (
          <div className={styles.placeholder}>
            <h3>Добро пожаловать в Руководство по Миру</h3>
            <p>Выберите том, главу, секцию или подсекцию из навигации слева для просмотра содержимого.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolumeStructure;
