import { FC, useState, useEffect, useMemo } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { 
  Panel, 
  PanelHeader, 
  PanelHeaderBack, 
  Group, 
  Tabs, 
  TabsItem,
  View,
  CellButton,
  Separator,
  Header
} from '@vkontakte/vkui';
import { Anketa, AnketaProps } from './Anketa';
import { API_URL } from '../api';

interface VersionHistory {
  version_id: number;
  version_number: number;
  created_at: string;
  data: Record<string, any>;
}

const AdminAnketaEditor: FC<AnketaProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [activeTab, setActiveTab] = useState('current');
  const [versions, setVersions] = useState<VersionHistory[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await fetch(`${API_URL}/characters/${id}/versions`);
        const data = await response.json();
        setVersions(data);
      } catch (error) {
        console.error('Failed to fetch versions:', error);
      }
    };
    
    if (id) {
      fetchVersions();
    }
  }, [id]);

  const handleVersionCompare = (versionId: number) => {
    setSelectedVersion(prev => prev === versionId ? null : versionId);
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/admin')} />}>
        Редактор анкеты
      </PanelHeader>

      <Tabs>
        <TabsItem
          id="current"
          selected={activeTab === 'current'}
          onClick={() => setActiveTab('current')}
        >
          Текущая версия
        </TabsItem>
        <TabsItem
          id="history"
          selected={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        >
          История изменений
        </TabsItem>
      </Tabs>

      <View activePanel={activeTab}>
        <Panel id="current">
          <Anketa id="current-anketa" fetchedUser={fetchedUser} />
        </Panel>

        <Panel id="history">
          <Group header={<Header>Выберите версию для сравнения</Header>}>
            {versions.map(version => (
              <div key={version.version_id}>
                <CellButton 
                  onClick={() => handleVersionCompare(version.version_id)}
                  aria-expanded={selectedVersion === version.version_id}
                  indicator={`Версия ${version.version_number}`}
                  subtitle={new Date(version.created_at).toLocaleDateString()}
                >
                  Изменения от {new Date(version.created_at).toLocaleString()}
                </CellButton>
                
                {selectedVersion === version.version_id && (
                  <div style={{ padding: '16px', background: 'var(--background_content)' }}>
                    {/* Здесь будет компонент сравнения версий */}
                    <pre>{JSON.stringify(version.data, null, 2)}</pre>
                  </div>
                )}
                <Separator />
              </div>
            ))}
          </Group>
        </Panel>
      </View>
    </Panel>
  );
};

export default AdminAnketaEditor;