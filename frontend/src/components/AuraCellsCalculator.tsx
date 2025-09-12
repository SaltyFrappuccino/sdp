import { FC } from 'react';
import { Div, Title } from '@vkontakte/vkui';

interface AuraCellData {
  rank: string;
  small: number;
  significant: number;
  ultimate: number;
}

interface Contract {
    sync_level?: number;
    // другие поля контракта...
}

interface Props {
  contracts: Contract[];
  currentRank: string;
  manualAuraCells?: {
    "Малые (I)": number;
    "Значительные (II)": number;
    "Предельные (III)": number;
  };
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  margin: '16px 0',
  backgroundColor: 'var(--background_content)'
};

const headerStyle: React.CSSProperties = {
  backgroundColor: 'var(--background_secondary)',
  padding: '12px',
  textAlign: 'left',
  borderBottom: '2px solid var(--field_border)'
};

const cellStyle: React.CSSProperties = {
  padding: '12px',
  borderBottom: '1px solid var(--field_border)'
};

const highlightedRowStyle: React.CSSProperties = {
  backgroundColor: 'var(--background_secondary)'
};

const AuraCellsCalculator: FC<Props> = ({ contracts, currentRank, manualAuraCells }) => {
  const auraCellsData: AuraCellData[] = [
    { rank: 'F', small: 2, significant: 0, ultimate: 0 },
    { rank: 'E', small: 4, significant: 0, ultimate: 0 },
    { rank: 'D', small: 8, significant: 2, ultimate: 0 },
    { rank: 'C', small: 16, significant: 4, ultimate: 0 },
    { rank: 'B', small: 32, significant: 8, ultimate: 1 },
    { rank: 'A', small: Infinity, significant: 16, ultimate: 2 },
    { rank: 'S', small: Infinity, significant: Infinity, ultimate: 4 },
    { rank: 'SS', small: Infinity, significant: Infinity, ultimate: 8 },
    { rank: 'SSS', small: Infinity, significant: Infinity, ultimate: 16 },
  ];

  const totalSynchronization = contracts.reduce((acc, contract) => acc + (contract.sync_level || 0), 0);

  const bonusSmallCells = Math.floor(totalSynchronization / 10);
  const bonusSignificantCells = Math.floor(totalSynchronization / 25);
  const bonusUltimateCells = Math.floor(totalSynchronization / 100);

  const getCalculatedCells = (rankData: AuraCellData) => {
      return {
          small: rankData.small === Infinity ? Infinity : rankData.small + bonusSmallCells,
          significant: rankData.significant === Infinity ? Infinity : rankData.significant + bonusSignificantCells,
          ultimate: rankData.ultimate + bonusUltimateCells
      }
  }

  return (
    <Div>
      <Title level="2" style={{ marginBottom: 16 }}>Ячейки Ауры</Title>
      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerStyle}>Ранг</th>
              <th style={headerStyle}>Малые (I)</th>
              <th style={headerStyle}>Значительные (II)</th>
              <th style={headerStyle}>Предельные (III)</th>
            </tr>
          </thead>
          <tbody>
            {auraCellsData.map((row) => {
              const calculated = getCalculatedCells(row);
              const isCurrentRank = row.rank === currentRank;

              const displaySmall = isCurrentRank 
                ? manualAuraCells?.["Малые (I)"] ?? calculated.small 
                : (row.small === Infinity ? '∞' : row.small);

              const displaySignificant = isCurrentRank
                ? manualAuraCells?.["Значительные (II)"] ?? calculated.significant
                : (row.significant === Infinity ? '∞' : row.significant);

              const displayUltimate = isCurrentRank
                ? manualAuraCells?.["Предельные (III)"] ?? calculated.ultimate
                : row.ultimate;


              return (
                <tr 
                  key={row.rank} 
                  style={isCurrentRank ? highlightedRowStyle : undefined}
                >
                  <td style={cellStyle}>{row.rank}</td>
                  <td style={cellStyle}>
                    {isCurrentRank ? 
                      `${displaySmall} (${row.small === Infinity ? '∞' : row.small} + ${bonusSmallCells})` : 
                      (row.small === Infinity ? '∞' : row.small)
                    }
                  </td>
                  <td style={cellStyle}>
                    {isCurrentRank ? 
                      `${displaySignificant} (${row.significant === Infinity ? '∞' : row.significant} + ${bonusSignificantCells})` :
                      (row.significant === Infinity ? '∞' : row.significant)
                    }
                  </td>
                  <td style={cellStyle}>
                    {isCurrentRank ? `${displayUltimate} (${row.ultimate} + ${bonusUltimateCells})` : row.ultimate}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Div>
  );
};

export default AuraCellsCalculator;