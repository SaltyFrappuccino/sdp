import React from 'react';
import styles from './IslandCard.module.css';

interface IslandDistrict {
  name: string;
  description: string;
  features?: string[];
}

interface IslandPillar {
  name: string;
  description: string;
}

interface Island {
  name: string;
  area: string;
  population: string;
  dominantFaction: string;
  atmosphere: string;
  districts: IslandDistrict[];
  economy: string;
  pillars: IslandPillar[];
  icon: string;
}

interface IslandCardProps {
  island: Island;
}

const IslandCard: React.FC<IslandCardProps> = ({ island }) => {
  return (
    <div className={styles.islandCard}>
      <div className={styles.islandHeader}>
        <span className={styles.icon}>{island.icon}</span>
        <div className={styles.islandInfo}>
          <h3 className={styles.islandName}>{island.name}</h3>
          <div className={styles.islandStats}>
            <span className={styles.stat}>Площадь: {island.area}</span>
            <span className={styles.stat}>Население: {island.population}</span>
            <span className={styles.stat}>Фракция: {island.dominantFaction}</span>
          </div>
        </div>
      </div>
      
      <div className={styles.atmosphere}>
        <h4>Общая атмосфера</h4>
        <p>{island.atmosphere}</p>
      </div>
      
      <div className={styles.districts}>
        <h4>Районы</h4>
        <div className={styles.districtsList}>
          {island.districts.map((district, index) => (
            <div key={index} className={styles.district}>
              <h5 className={styles.districtName}>{district.name}</h5>
              <p className={styles.districtDescription}>{district.description}</p>
              {district.features && (
                <ul className={styles.districtFeatures}>
                  {district.features.map((feature, featureIndex) => (
                    <li key={featureIndex}>{feature}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className={styles.economy}>
        <h4>Экономика</h4>
        <p>{island.economy}</p>
      </div>
      
      <div className={styles.pillars}>
        <h4>Столпы власти</h4>
        <div className={styles.pillarsList}>
          {island.pillars.map((pillar, index) => (
            <div key={index} className={styles.pillar}>
              <h5 className={styles.pillarName}>{pillar.name}</h5>
              <p className={styles.pillarDescription}>{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IslandCard;
