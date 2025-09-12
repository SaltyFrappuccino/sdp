import { useState, useEffect } from 'react';
import { useParams, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { Panel, PanelHeader, Button, Div, Spacing, ScreenSpinner, Group, Cell, Header, PanelHeaderBack } from '@vkontakte/vkui';
import { getVersionDiff } from '../utils/diff';
import axios, { AxiosResponse } from 'axios';
import { API_URL } from '../api';

const formatValue = (value: any): string => {
  if (value === null || value === undefined) {
    return '(пусто)';
  }
  if (typeof value === 'string' && value.trim() === '') {
    return '(пустая строка)';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

interface UpdateData {
  id: number;
  anketa_id: number;
  old_data: any;
  new_data: any;
  status: string;
}

const UpdateViewer = ({ id }: { id: string }) => {
  const params = useParams<'update_id'>();
  const update_id = params?.update_id;
  const routeNavigator = useRouteNavigator();
  const [update, setUpdate] = useState<UpdateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [diffResult, setDiffResult] = useState<any>(null);

  useEffect(() => {
    if (update_id) {
      axios.get(`${API_URL}/updates/${update_id}`).then((response: AxiosResponse<any>) => {
        const oldData = response.data.original_character;
        const newData = response.data.update.updated_data;
        const updatePayload: UpdateData = {
          id: response.data.update.id,
          anketa_id: response.data.update.character_id,
          status: response.data.update.status,
          old_data: oldData,
          new_data: newData,
        };
        setUpdate(updatePayload);
        const differences = getVersionDiff(newData, oldData);
        setDiffResult(differences);
        setLoading(false);
      }).catch((error: any) => {
        console.error("Error fetching update:", error);
        setLoading(false);
      });
    }
  }, [update_id]);

  const handleApprove = async () => {
    if (!update_id) return;
    const adminId = localStorage.getItem('adminId');
    if (!adminId) {
      console.error('Admin ID not found, please login again.');
      return;
    }
    try {
      await axios.post(`${API_URL}/updates/${update_id}/approve`, {}, {
        headers: { 'X-Admin-Id': adminId },
        withCredentials: true
      });
      routeNavigator.push('/admin_panel');
    } catch (error) {
      console.error("Error approving update:", error);
    }
  };

  const handleReject = async () => {
    if (!update_id) return;
    const adminId = localStorage.getItem('adminId');
    if (!adminId) {
      console.error('Admin ID not found, please login again.');
      return;
    }
    try {
      await axios.post(`${API_URL}/updates/${update_id}/reject`, {}, {
        headers: { 'X-Admin-Id': adminId },
        withCredentials: true
      });
      routeNavigator.push('/admin_panel');
    } catch (error) {
      console.error("Error rejecting update:", error);
    }
  };

  if (loading) {
    return <ScreenSpinner />;
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/admin_panel')} />}>Просмотр изменений</PanelHeader>
      {update && diffResult && (
        <Div>
          <Group header={<Header>Измененные поля</Header>}>
            {diffResult.changed && Object.keys(diffResult.changed).map(key => (
              <Cell key={key} multiline>
                <strong>{key}:</strong>
                <Div>
                  <span style={{ color: 'red' }}>- {formatValue(diffResult.changed[key].from)}</span>
                  <br />
                  <span style={{ color: 'green' }}>+ {formatValue(diffResult.changed[key].to)}</span>
                </Div>
              </Cell>
            ))}
          </Group>
          <Group header={<Header>Добавленные поля</Header>}>
            {diffResult.added && Object.keys(diffResult.added).map(key => (
              <Cell key={key} multiline>
                <strong>{key}:</strong> {formatValue(diffResult.added[key])}
              </Cell>
            ))}
          </Group>
          <Group header={<Header>Удаленные поля</Header>}>
            {diffResult.removed && Object.keys(diffResult.removed).map(key => (
              <Cell key={key} multiline>
                <strong>{key}:</strong> {formatValue(diffResult.removed[key])}
              </Cell>
            ))}
          </Group>
          <Spacing size={16} />
          <Button size="l" stretched mode="primary" onClick={handleApprove}>
            Принять
          </Button>
          <Spacing size={8} />
          <Button size="l" stretched mode="outline" appearance="negative" onClick={handleReject}>
            Отклонить
          </Button>
        </Div>
      )}
    </Panel>
  );
};

export default UpdateViewer;
