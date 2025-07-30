import { FC, useState } from 'react';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Button,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  Div,
  Accordion,
  Header,
  SimpleCell,
  Text
} from '@vkontakte/vkui';
import { Anketa, AnketaProps } from './Anketa';
import { API_URL } from '../api';
import { getVersionDiff } from '../utils/diff';

const AdminAnketaEditor: FC<AnketaProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<'id'>();
  const characterId = params?.id;
  const [versions, setVersions] = useState<any[]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const fetchVersions = async () => {
    try {
      const response = await fetch(`${API_URL}/characters/${characterId}/versions`);
      const data = await response.json();
      setVersions(data);
      setActiveModal('history');
    } catch (error) {
      console.error('Failed to fetch character versions:', error);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/admin_panel')} />}>
        Редактор анкеты
      </PanelHeader>

      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalPage
          id="history"
          onClose={() => setActiveModal(null)}
          header={<ModalPageHeader>История изменений</ModalPageHeader>}
        >
          <Div>
            {versions.length > 0 ? (
              versions.map((version: any) => (
                <Accordion key={version.version_id}>
                  <Accordion.Summary>
                    Версия {version.version_number} - {new Date(version.created_at).toLocaleString()}
                  </Accordion.Summary>
                  <Accordion.Content>
                    <Div>
                      {(() => {
                        const currentVersionData = version.data ? JSON.parse(version.data) : {};
                        const previousVersionData = versions[versions.indexOf(version) + 1]
                          ? JSON.parse((versions[versions.indexOf(version) + 1] as any).data)
                          : null;
                        const diff = getVersionDiff(currentVersionData, previousVersionData);

                        return (
                          <>
                            {Object.keys(diff.changed).length > 0 && (
                              <Group header={<Header subtitle="Изменено" />}>
                                {Object.entries(diff.changed).map(([key, { from, to }]) => (
                                  <SimpleCell key={key} multiline>
                                    <Text><b>{key}:</b></Text>
                                    <Text>Было: {JSON.stringify(from)}</Text>
                                    <Text>Стало: {JSON.stringify(to)}</Text>
                                  </SimpleCell>
                                ))}
                              </Group>
                            )}
                            {Object.keys(diff.added).length > 0 && (
                              <Group header={<Header subtitle="Добавлено" />}>
                                {Object.entries(diff.added).map(([key, value]) => (
                                  <SimpleCell key={key} multiline>
                                    <b>{key}:</b> {JSON.stringify(value)}
                                  </SimpleCell>
                                ))}
                              </Group>
                            )}
                            {Object.keys(diff.removed).length > 0 && (
                              <Group header={<Header subtitle="Удалено" />}>
                                {Object.keys(diff.removed).map(key => (
                                  <SimpleCell key={key}>{key}</SimpleCell>
                                ))}
                              </Group>
                            )}
                          </>
                        );
                      })()}
                    </Div>
                  </Accordion.Content>
                </Accordion>
              ))
            ) : (
              <p>История изменений пуста.</p>
            )}
          </Div>
        </ModalPage>
      </ModalRoot>

      <Anketa id={characterId || 'new'} fetchedUser={fetchedUser} />

      <Div>
        <Button stretched size="l" mode="secondary" onClick={fetchVersions}>
          История изменений
        </Button>
      </Div>
    </Panel>
  );
};

export default AdminAnketaEditor;