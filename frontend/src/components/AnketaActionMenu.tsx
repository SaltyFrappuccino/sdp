import { FC, useState } from 'react';
import {
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  SimpleCell,
  Group,
  Button,
  ButtonGroup,
  Div,
} from '@vkontakte/vkui';
import {
  Icon24View,
  Icon24Write,
  Icon24Download,
  Icon24Done,
  Icon24Cancel,
  Icon24Delete,
} from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';

interface AnketaActionMenuProps {
  characterId: number;
  characterName: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  showViewOption?: boolean;
  showEditOption?: boolean;
  showDownloadOption?: boolean;
  showApproveOption?: boolean;
  showRejectOption?: boolean;
  showDeleteOption?: boolean;
}

export const AnketaActionMenu: FC<AnketaActionMenuProps> = ({
  characterId,
  characterName,
  onClose,
  onSuccess,
  onError,
  showViewOption = true,
  showEditOption = true,
  showDownloadOption = true,
  showApproveOption = true,
  showRejectOption = true,
  showDeleteOption = true,
}) => {
  const routeNavigator = useRouteNavigator();
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleView = () => {
    onClose();
    routeNavigator.push(`/anketa_detail/${characterId}`);
  };

  const handleEdit = () => {
    onClose();
    routeNavigator.push(`/admin_anketa_edit/${characterId}`);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(`${API_URL}/characters/${characterId}`);
      const data = await response.json();
      
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${characterName}_${characterId}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      onSuccess?.('Анкета успешно скачана');
    } catch (error) {
      console.error('Failed to download character:', error);
      onError?.('Не удалось скачать анкету');
    }
    onClose();
  };

  const handleApprove = async () => {
    const adminId = localStorage.getItem('adminId');
    if (!adminId) {
      onError?.('Необходимо войти как администратор');
      onClose();
      return;
    }

    try {
      const response = await fetch(`${API_URL}/characters/${characterId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': adminId,
        },
        body: JSON.stringify({ status: 'Принято' }),
      });

      if (response.ok) {
        onSuccess?.(`Анкета "${characterName}" принята`);
      } else {
        const errorData = await response.json();
        onError?.(errorData.error || 'Ошибка при принятии анкеты');
      }
    } catch (error) {
      console.error('Failed to approve character:', error);
      onError?.('Ошибка сети при принятии анкеты');
    }
    onClose();
  };

  const handleReject = () => {
    setShowRejectConfirm(true);
  };

  const confirmReject = async () => {
    const adminId = localStorage.getItem('adminId');
    if (!adminId) {
      onError?.('Необходимо войти как администратор');
      setShowRejectConfirm(false);
      onClose();
      return;
    }

    try {
      const response = await fetch(`${API_URL}/characters/${characterId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': adminId,
        },
        body: JSON.stringify({ status: 'Отклонено' }),
      });

      if (response.ok) {
        onSuccess?.(`Анкета "${characterName}" отклонена`);
      } else {
        const errorData = await response.json();
        onError?.(errorData.error || 'Ошибка при отклонении анкеты');
      }
    } catch (error) {
      console.error('Failed to reject character:', error);
      onError?.('Ошибка сети при отклонении анкеты');
    }
    setShowRejectConfirm(false);
    onClose();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    const adminId = localStorage.getItem('adminId');
    if (!adminId) {
      onError?.('Необходимо войти как администратор');
      setShowDeleteConfirm(false);
      onClose();
      return;
    }

    try {
      const response = await fetch(`${API_URL}/characters/${characterId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-id': adminId,
        },
      });

      if (response.ok) {
        onSuccess?.(`Анкета "${characterName}" удалена`);
      } else {
        const errorData = await response.json();
        onError?.(errorData.error || 'Ошибка при удалении анкеты');
      }
    } catch (error) {
      console.error('Failed to delete character:', error);
      onError?.('Ошибка сети при удалении анкеты');
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  if (showRejectConfirm) {
    return (
      <ModalRoot activeModal="reject-confirm" onClose={() => setShowRejectConfirm(false)}>
        <ModalPage
          id="reject-confirm"
          onClose={() => setShowRejectConfirm(false)}
          header={<ModalPageHeader>Подтверждение отклонения</ModalPageHeader>}
        >
          <Div>
            <p>Вы уверены, что хотите отклонить анкету "{characterName}"?</p>
            <ButtonGroup stretched mode="horizontal" gap="s" style={{ marginTop: 16 }}>
              <Button
                size="l"
                mode="outline"
                onClick={() => setShowRejectConfirm(false)}
                stretched
              >
                Отменить
              </Button>
              <Button
                size="l"
                mode="outline"
                appearance="negative"
                onClick={confirmReject}
                stretched
              >
                Отклонить
              </Button>
            </ButtonGroup>
          </Div>
        </ModalPage>
      </ModalRoot>
    );
  }

  if (showDeleteConfirm) {
    return (
      <ModalRoot activeModal="delete-confirm" onClose={() => setShowDeleteConfirm(false)}>
        <ModalPage
          id="delete-confirm"
          onClose={() => setShowDeleteConfirm(false)}
          header={<ModalPageHeader>Подтверждение удаления</ModalPageHeader>}
        >
          <Div>
            <p>Вы уверены, что хотите удалить анкету "{characterName}"? Это действие необратимо.</p>
            <ButtonGroup stretched mode="horizontal" gap="s" style={{ marginTop: 16 }}>
              <Button
                size="l"
                mode="outline"
                onClick={() => setShowDeleteConfirm(false)}
                stretched
              >
                Отменить
              </Button>
              <Button
                size="l"
                mode="outline"
                appearance="negative"
                onClick={confirmDelete}
                stretched
              >
                Удалить
              </Button>
            </ButtonGroup>
          </Div>
        </ModalPage>
      </ModalRoot>
    );
  }

  return (
    <ModalRoot activeModal="actions" onClose={onClose}>
      <ModalPage
        id="actions"
        onClose={onClose}
        header={<ModalPageHeader>Действия с анкетой</ModalPageHeader>}
      >
        <Group>
          {showViewOption && (
            <SimpleCell
              before={<Icon24View />}
              onClick={handleView}
            >
              Просмотр
            </SimpleCell>
          )}
          {showEditOption && (
            <SimpleCell
              before={<Icon24Write />}
              onClick={handleEdit}
            >
              Редактировать
            </SimpleCell>
          )}
          {showDownloadOption && (
            <SimpleCell
              before={<Icon24Download />}
              onClick={handleDownload}
            >
              Скачать
            </SimpleCell>
          )}
          {showApproveOption && (
            <SimpleCell
              before={<Icon24Done />}
              onClick={handleApprove}
            >
              Принять
            </SimpleCell>
          )}
          {showRejectOption && (
            <SimpleCell
              before={<Icon24Cancel />}
              onClick={handleReject}
            >
              Отклонить
            </SimpleCell>
          )}
          {showDeleteOption && (
            <SimpleCell
              before={<Icon24Delete />}
              onClick={handleDelete}
            >
              Удалить
            </SimpleCell>
          )}
        </Group>
      </ModalPage>
    </ModalRoot>
  );
};
