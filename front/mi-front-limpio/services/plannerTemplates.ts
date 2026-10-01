export const PLANNER_TASK_TEMPLATES = [
  {
    key: 'cleaning',
    label: 'Limpieza',
    defaultTitle: 'Tarea de limpieza',
    category: 'Limpieza',
  },
  {
    key: 'shopping',
    label: 'Compras',
    defaultTitle: 'Hacer compras',
    category: 'Compras',
  },
  {
    key: 'pets',
    label: 'Mascotas',
    defaultTitle: 'Cuidar mascota',
    category: 'Mascotas',
  },
  {
    key: 'medication',
    label: 'Medicacion',
    defaultTitle: 'Revisar medicacion',
    category: 'Medicacion',
  },
  {
    key: 'studies',
    label: 'Estudios',
    defaultTitle: 'Organizar estudios',
    category: 'Estudios',
  },
  {
    key: 'payments',
    label: 'Pagos',
    defaultTitle: 'Realizar pago',
    category: 'Pagos',
  },
] as const;

export const OTHER_PLANNER_TEMPLATE = {
  key: 'other',
  label: 'Otro',
  defaultTitle: '',
  category: '',
} as const;
