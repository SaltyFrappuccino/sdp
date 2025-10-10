// Validation utilities

import { ValidationError } from './errors.js';

export const validateRequiredFields = (data: any, requiredFields: string[]): void => {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === null || value === undefined || String(value).trim() === '';
  });

  if (missingFields.length > 0) {
    throw new ValidationError(`Отсутствуют или не заполнены обязательные поля: ${missingFields.join(', ')}`);
  }
};

export const validateAdmin = (adminId: string | undefined, password: string | undefined): boolean => {
  const ADMIN_PASSWORD = 'heartattack';
  const ADMIN_VK_ID = '1';
  
  return adminId === ADMIN_VK_ID && password === ADMIN_PASSWORD;
};

export const validateAdminById = (adminId: string | undefined): boolean => {
  const ADMIN_VK_ID = '1';
  return adminId === ADMIN_VK_ID;
};

export const isValidStatus = (status: string): boolean => {
  const validStatuses = ['На рассмотрении', 'Принято', 'Отклонено'];
  return validStatuses.includes(status);
};

