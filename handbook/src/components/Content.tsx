import React from 'react';
import styles from './Content.module.css';
import { Chapter, Attribute, TagCost, TagDescription } from '@/data/combatSystemData';
import AttributeCard from '@/components/AttributeCard';
import TagCostsTable from '@/components/TagCostsTable';
import TagDescriptionCard from '@/components/TagDescriptionCard';
import BudgetTable from '@/components/BudgetTable';
import ExceptionCard from '@/components/ExceptionCard';
// import ImageDisplay from '@/components/ImageDisplay'; // Не используется
import DominionExamples from '@/components/DominionExamples';
import ManifestationModes from '@/components/ManifestationModes';
import TableOfContents from '@/components/TableOfContents';
import InPageSearch from '@/components/InPageSearch';
import RankTable from '@/components/RankTable';
import ArchetypeList from '@/components/ArchetypeList';
import SynkiTypes from '@/components/SynkiTypes';
import BookmarkButton from '@/components/BookmarkButton';
import AttributeDisplay from '@/components/AttributeDisplay';
import ArchetypeDisplay from '@/components/ArchetypeDisplay';
import ResourceDisplay from '@/components/ResourceDisplay';
import GiftDisplay from '@/components/GiftDisplay';
import TagDisplay from '@/components/TagDisplay';
import Spoiler from '@/components/Spoiler';
import Table from '@/components/Table';

interface ContentProps {
  chapter: Chapter;
  bookType?: 'lore' | 'character' | 'combat';
}

const Content: React.FC<ContentProps> = ({ chapter, bookType = 'combat' }) => {
  const [, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState(0);

  const handleInPageSearch = (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setSearchResults(0);
      // Убираем подсветку
      const highlighted = document.querySelectorAll('.search-highlight');
      highlighted.forEach(el => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ''), el);
          parent.normalize();
        }
      });
      return;
    }

    // Ищем и подсвечиваем текст
    const content = document.querySelector('.content');
    if (content) {
      const walker = document.createTreeWalker(
        content,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let node;
      let count = 0;
      const nodes: Text[] = [];
      
      while (node = walker.nextNode()) {
        nodes.push(node as Text);
      }
      
      nodes.forEach(textNode => {
        const text = textNode.textContent || '';
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = text.match(regex);
        
        if (matches) {
          count += matches.length;
          const highlightedText = text.replace(regex, '<mark class="search-highlight">$&</mark>');
          const span = document.createElement('span');
          span.innerHTML = highlightedText;
          textNode.parentNode?.replaceChild(span, textNode);
        }
      });
      
      setSearchResults(count);
    }
  };

  const renderContent = (item: any, index: number) => {
    switch (item.type) {
      case 'paragraph':
        if (Array.isArray(item.items)) {
          return (
            <ul key={index} className={styles.list}>
              {item.items.map((text: string, i: number) => <li key={i}>{text}</li>)}
            </ul>
          );
        }
        return <p key={index}>{item.text}</p>;
      case 'heading':
        return (
          <div key={index} className={styles.headingContainer}>
            <h2 id={`heading-${index}`} className={styles.heading}>{item.text}</h2>
            <BookmarkButton
              bookType={bookType}
              chapterId={chapter.id}
              headingId={`heading-${index}`}
              title={item.text}
            />
          </div>
        );
      case 'subheading':
        return (
          <div key={index} className={styles.subheadingContainer}>
            <h3 id={`subheading-${index}`} className={styles.subheading}>{item.text}</h3>
            <BookmarkButton
              bookType={bookType}
              chapterId={chapter.id}
              headingId={`subheading-${index}`}
              title={item.text}
            />
          </div>
        );
      case 'list':
        return (
          <ul key={index} className={styles.list}>
            {item.items.map((text: string, i: number) => <li key={i}>{text}</li>)}
          </ul>
        );
      case 'attributes':
        return (
          <div key={index} className={styles.grid}>
            {item.items.map((attr: Attribute) => <AttributeCard key={attr.name} attribute={attr} />)}
          </div>
        );
      case 'tagCosts':
        return <TagCostsTable key={index} items={item.items as TagCost[]} />;
      case 'tagDescriptions':
        return (
          <div key={index}>
            {item.items.map((tag: TagDescription) => <TagDescriptionCard key={tag.name} tag={tag} />)}
          </div>
        );
      case 'budget':
        return <BudgetTable key={index} items={item.items} />;
      case 'exceptions':
        return <ExceptionCard key={index} items={item.items} />;
      case 'dominionExamples':
        return <DominionExamples key={index} items={item.items} />;
      case 'manifestationModes':
        return <ManifestationModes key={index} items={item.items} />;
      case 'image':
        return null; // Убираем изображения
      case 'rankTable':
        return <RankTable key={index} items={item.items} title={item.title} />;
      case 'archetypeList':
        return <ArchetypeList key={index} items={item.items} title={item.title} />;
      case 'synkiTypes':
        return <SynkiTypes key={index} items={item.items} />;
      case 'attributeDisplay':
        return <AttributeDisplay key={index} attributes={item.items} title={item.title} />;
      case 'archetypeDisplay':
        return <ArchetypeDisplay key={index} archetypes={item.items} title={item.title} />;
      case 'resourceDisplay':
        return <ResourceDisplay key={index} resources={item.items} title={item.title} />;
      case 'giftDisplay':
        return <GiftDisplay key={index} gifts={item.items} title={item.title} />;
      case 'tagDisplay':
        return <TagDisplay key={index} tags={item.items} title={item.title} />;
      case 'spoiler':
        return <Spoiler key={index} title={item.title} content={item.content} />;
      case 'table':
        return <Table key={index} title={item.title} headers={item.headers} rows={item.rows} />;
      default:
        return <p key={index}>{JSON.stringify(item)}</p>;
    }
  };

  return (
    <main className={`${styles.content} content`}>
      <InPageSearch onSearch={handleInPageSearch} searchResults={searchResults} />
      <h1 className={styles.chapterTitle}>{chapter.title}</h1>
      <TableOfContents chapter={chapter} />
      {chapter.content.map(renderContent)}
    </main>
  );
};

export default Content;
