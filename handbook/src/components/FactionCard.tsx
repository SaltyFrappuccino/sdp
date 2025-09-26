import React from 'react';
import styles from './FactionCard.module.css';

interface FactionMember {
  title: string;
  description: string;
}

interface FactionStructure {
  name: string;
  members: FactionMember[];
}

interface Faction {
  name: string;
  description: string;
  philosophy: string;
  structure: FactionStructure[];
  icon: string;
}

interface FactionCardProps {
  faction: Faction;
}

const FactionCard: React.FC<FactionCardProps> = ({ faction }) => {
  return (
    <div className={styles.factionCard}>
      <div className={styles.factionHeader}>
        <span className={styles.icon}>{faction.icon}</span>
        <h3 className={styles.factionName}>{faction.name}</h3>
      </div>
      
      <div className={styles.factionDescription}>
        {faction.description}
      </div>
      
      <div className={styles.philosophy}>
        <strong>Философия:</strong> {faction.philosophy}
      </div>
      
      <div className={styles.structure}>
        {faction.structure.map((section, index) => (
          <div key={index} className={styles.structureSection}>
            <h4 className={styles.sectionName}>{section.name}</h4>
            <div className={styles.membersList}>
              {section.members.map((member, memberIndex) => (
                <div key={memberIndex} className={styles.member}>
                  <span className={styles.memberTitle}>{member.title}:</span>
                  <span className={styles.memberDescription}>{member.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FactionCard;
