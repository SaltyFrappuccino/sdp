import React from 'react';
import { MarkdownHandbookParser } from '../utils/markdownHandbookParser';

export const TestHandbook: React.FC = () => {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const handbookData = await MarkdownHandbookParser.loadAllChapters();
        setData(handbookData);
        console.log('Handbook data loaded:', handbookData);
      } catch (error) {
        console.error('Error loading handbook data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <div>Loading handbook data...</div>;
  }

  if (!data) {
    return <div>No data loaded</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Handbook Test</h1>
      <div>
        {Object.entries(data).map(([category, sections]: [string, any]) => (
          <div key={category} style={{ marginBottom: '30px' }}>
            <h2>{category}</h2>
            {sections.map((section: any) => (
              <div key={section.id} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
                <h3>{section.title}</h3>
                <p><strong>Description:</strong> {section.content.description}</p>
                <p><strong>Key Points:</strong></p>
                <ul>
                  {section.content.keyPoints.map((point: string, index: number) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
                {section.content.subsections && section.content.subsections.length > 0 && (
                  <div>
                    <p><strong>Subsections:</strong></p>
                    {section.content.subsections.map((sub: any, subIndex: number) => (
                      <div key={sub.id} style={{ marginLeft: '20px', marginBottom: '10px' }}>
                        <h4>{sub.title}</h4>
                        <div dangerouslySetInnerHTML={{ __html: sub.content.replace(/\n/g, '<br>') }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};