import { Signal } from '@angular/core';
import { disabled, minLength, required, schema } from '@angular/forms/signals';

export interface StationFormData {
  name: string;
  code: string;
  address: string;
  governorate: string;
  isActive: boolean;
  managerId: number | null;
  assistantId: number | null;
}

export const stationInitialData: StationFormData = {
  name: '',
  code: '',
  address: '',
  governorate: '',
  isActive: true,
  managerId: null,
  assistantId: null,
};

export const createStationSchema = (editMode: Signal<boolean>) =>
  schema<StationFormData>((root) => {
    required(root.name, { message: 'Station name is required' });
    minLength(root.name, 2, { message: 'Name must be at least 2 characters' });

    required(root.code, { message: 'Station code is required' });
    minLength(root.code, 3, { message: 'Code must be at least 3 characters' });

    // Signal Forms owns disabled state; disable code when editing.
    disabled(root.code, () => editMode());

    required(root.governorate, { message: 'Governorate is required' });
  });

export const GOVERNORATES = [
  'Tunis',
  'Ariana',
  'Ben Arous',
  'Manouba',
  'Nabeul',
  'Zaghouan',
  'Bizerte',
  'Béja',
  'Jendouba',
  'Kef',
  'Siliana',
  'Sousse',
  'Monastir',
  'Mahdia',
  'Sfax',
  'Kairouan',
  'Kasserine',
  'Sidi Bouzid',
  'Gabès',
  'Médenine',
  'Tataouine',
  'Gafsa',
  'Tozeur',
  'Kebili',
];
