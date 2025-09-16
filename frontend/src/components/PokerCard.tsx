import React, { FC } from 'react';

interface Card {
  rank: string; // 'A', '2', '3', ..., 'K', 'T'
  suit: string; // 'c', 'd', 'h', 's'
}

interface PokerCardProps {
  card?: Card;
  isHidden?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const suitSymbols: { [key: string]: string } = {
  'c': '♣',
  'd': '♦',
  'h': '♥',
  's': '♠'
};

const suitColors: { [key: string]: string } = {
  'c': '#2c3e50',
  'd': '#e74c3c',
  'h': '#e74c3c',
  's': '#2c3e50'
};

const rankDisplay: { [key: string]: string } = {
  'T': '10',
  'J': 'В',
  'Q': 'Д',
  'K': 'К',
  'A': 'Т'
};

export const PokerCard: FC<PokerCardProps> = ({ card, isHidden = false, size = 'medium' }) => {
  const sizeStyles = {
    small: { width: 40, height: 56, fontSize: 10 },
    medium: { width: 60, height: 84, fontSize: 12 },
    large: { width: 80, height: 112, fontSize: 16 }
  };

  const style = sizeStyles[size];

  if (isHidden || !card) {
    return (
      <div
        style={{
          width: style.width,
          height: style.height,
          border: '2px solid #34495e',
          borderRadius: 8,
          backgroundColor: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: style.fontSize + 8,
          color: '#ecf0f1',
          fontWeight: 'bold',
          margin: '2px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)'
        }}
      >
        ?
      </div>
    );
  }

  const displayRank = rankDisplay[card.rank] || card.rank;
  const suit = suitSymbols[card.suit] || card.suit;
  const color = suitColors[card.suit] || '#2c3e50';

  return (
    <div
      style={{
        width: style.width,
        height: style.height,
        border: '2px solid #bdc3c7',
        borderRadius: 8,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '4px',
        margin: '2px',
        fontSize: style.fontSize,
        fontWeight: 'bold',
        color: color,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ lineHeight: 1 }}>{displayRank}</div>
        <div style={{ fontSize: style.fontSize + 4, lineHeight: 1 }}>{suit}</div>
      </div>
      
      <div style={{ 
        position: 'absolute',
        bottom: '4px',
        right: '4px',
        transform: 'rotate(180deg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start'
      }}>
        <div style={{ lineHeight: 1 }}>{displayRank}</div>
        <div style={{ fontSize: style.fontSize + 4, lineHeight: 1 }}>{suit}</div>
      </div>
    </div>
  );
};