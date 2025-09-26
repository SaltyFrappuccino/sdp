import React, { useState } from 'react';
import styles from './WorldGuide.module.css';
import AttributeList from './AttributeList';
import FactionCard from './FactionCard';
import IslandCard from './IslandCard';
import EconomyTable from './EconomyTable';
import SynkiCard from './SynkiCard';
import MechanicCard from './MechanicCard';
import SynkiPricesTable from './SynkiPricesTable';
import LivingCostsTable from './LivingCostsTable';
import LoreSection from './LoreSection';
import VolumeStructure from './VolumeStructure';
import BookmarksPanel from './BookmarksPanel';
import Pagination from './Pagination';
import BookmarkButton from './BookmarkButton';
import { attributesData } from '../data/attributesData';
import { factionsData } from '../data/factionsData';
import { islandsData } from '../data/islandsData';
import { economyData, synkiPricesData, livingCostsData } from '../data/economyData';
import { synkiData } from '../data/synkiData';
import { mechanicsData } from '../data/mechanicsData';
import { loreData } from '../data/loreData';
import { volumesData } from '../data/volumesData';

const WorldGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState('attributes');
  const [showBookmarks, setShowBookmarks] = useState(false);

  const sections = [
    { id: 'volumes', title: 'Томы', icon: '📚' },
    { id: 'lore', title: 'Лор', icon: '📖' },
    { id: 'attributes', title: 'Атрибуты', icon: '💪' },
    { id: 'factions', title: 'Фракции', icon: '🏛️' },
    { id: 'islands', title: 'Острова', icon: '🏝️' },
    { id: 'economy', title: 'Экономика', icon: '💰' },
    { id: 'synki', title: 'Синки', icon: '💎' },
    { id: 'mechanics', title: 'Механики', icon: '⚙️' }
  ];

  const currentIndex = sections.findIndex(section => section.id === activeSection);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setActiveSection(sections[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < sections.length - 1) {
      setActiveSection(sections[currentIndex + 1].id);
    }
  };

  const handleBookmarkClick = (section: string) => {
    setActiveSection(section);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'volumes':
        return (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Структурированное Руководство
              <BookmarkButton section="volumes" title="Структурированное Руководство" />
            </h2>
            <p className={styles.sectionDescription}>
              Полное руководство по миру, организованное в тома, главы и секции для удобного изучения.
            </p>
            <VolumeStructure volumes={volumesData} />
          </div>
        );

      case 'lore':
        return (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Лор и История Мира
              <BookmarkButton section="lore" title="Лор и История Мира" />
            </h2>
            <p className={styles.sectionDescription}>
              История мира, каким мы его знаем, началась в 1800 году с события, 
              которое навсегда изменило реальность и породило новый миропорядок.
            </p>
            <div className={styles.loreGrid}>
              {loreData.map((section, index) => (
                <LoreSection key={index} section={section} />
              ))}
            </div>
          </div>
        );

      case 'attributes':
        return (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Атрибуты Проводников
              <BookmarkButton section="attributes" title="Атрибуты Проводников" />
            </h2>
            <p className={styles.sectionDescription}>
              Атрибуты — это основа, на которую накладываются сверхъестественные способности. 
              Они определяют, как ваш персонаж действует в те моменты, когда Аура не используется.
            </p>
            <AttributeList attributes={attributesData} />
          </div>
        );

      case 'factions':
        return (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Фракции
              <BookmarkButton section="factions" title="Фракции" />
            </h2>
            <p className={styles.sectionDescription}>
              Три могущественные фракции ведут вечную борьбу за влияние в мире. 
              Каждая имеет свою философию, структуру и методы достижения целей.
            </p>
            <div className={styles.factionsGrid}>
              {factionsData.map((faction, index) => (
                <FactionCard key={index} faction={faction} />
              ))}
            </div>
          </div>
        );

      case 'islands':
        return (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Острова
              <BookmarkButton section="islands" title="Острова" />
            </h2>
            <p className={styles.sectionDescription}>
              Шесть крупных островов-государств, каждый со своей уникальной атмосферой, 
              экономикой и столпами власти.
            </p>
            <div className={styles.islandsList}>
              {islandsData.map((island, index) => (
                <IslandCard key={index} island={island} />
              ))}
            </div>
          </div>
        );

      case 'economy':
        return (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Экономика
              <BookmarkButton section="economy" title="Экономика" />
            </h2>
            <p className={styles.sectionDescription}>
              В мире, пережившем Разлом, экономика определяет судьбы, разжигает войны 
              и разделяет людей глубже, чем любые океаны между островами.
            </p>
            <EconomyTable 
              title="Награды по Рангам"
              headers={['Ранг', 'Награда за Квест', 'Награда за Врата']}
              rows={economyData}
            />
            <SynkiPricesTable 
              title="Рынок Синки: Цены по Рангам"
              data={synkiPricesData}
            />
            <LivingCostsTable 
              title="Цена Жизни и Бюджет Проводника"
              data={livingCostsData}
            />
          </div>
        );

      case 'synki':
        return (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Синки
              <BookmarkButton section="synki" title="Синки" />
            </h2>
            <p className={styles.sectionDescription}>
              Артефакты и кристаллы, содержащие в себе силу Ауры. 
              От простых Осколков до могущественных Фокусов.
            </p>
            <div className={styles.synkiGrid}>
              {synkiData.map((synkiType, index) => (
                <SynkiCard key={index} synkiType={synkiType} />
              ))}
            </div>
          </div>
        );

      case 'mechanics':
        return (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Игровые Механики
              <BookmarkButton section="mechanics" title="Игровые Механики" />
            </h2>
            <p className={styles.sectionDescription}>
              Специальные механики, которые делают мир живым и интересным для игры.
            </p>
            <div className={styles.mechanicsGrid}>
              {mechanicsData.map((mechanic, index) => (
                <MechanicCard key={index} mechanic={mechanic} />
              ))}
            </div>
          </div>
        );

      default:
        return <div>Раздел не найден</div>;
    }
  };

  return (
    <div className={styles.worldGuide}>
      <BookmarksPanel 
        isVisible={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        onBookmarkClick={handleBookmarkClick}
      />
      
      <div className={styles.sidebar}>
        <h1 className={styles.title}>Руководство по Миру</h1>
        <button 
          className={styles.bookmarksButton}
          onClick={() => setShowBookmarks(true)}
          title="Показать закладки"
        >
          🔖 Закладки
        </button>
        <nav className={styles.navigation}>
          {sections.map((section) => (
            <button
              key={section.id}
              className={`${styles.navButton} ${activeSection === section.id ? styles.active : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className={styles.navIcon}>{section.icon}</span>
              <span className={styles.navTitle}>{section.title}</span>
            </button>
          ))}
        </nav>
      </div>
      
      <div className={styles.content}>
        <Pagination
          currentIndex={currentIndex}
          totalItems={sections.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
          className={styles.topPagination}
        />
        
        {renderContent()}
        
        <Pagination
          currentIndex={currentIndex}
          totalItems={sections.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
          className={styles.bottomPagination}
        />
      </div>
    </div>
  );
};

export default WorldGuide;
