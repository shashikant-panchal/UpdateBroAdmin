export interface PhoneModel {
  id: string;
  name: string;
  brand: 'Apple' | 'Samsung';
  series: string;
}

export const SUPPORTED_PHONE_MODELS: PhoneModel[] = [
  // iPhone 18 Series (2026)
  { id: 'ip-18-pro-max', name: 'iPhone 18 Pro Max', brand: 'Apple', series: 'iPhone 18 Series (2026)' },
  { id: 'ip-18-pro', name: 'iPhone 18 Pro', brand: 'Apple', series: 'iPhone 18 Series (2026)' },
  { id: 'ip-18-duo', name: 'iPhone Duo', brand: 'Apple', series: 'iPhone 18 Series (2026)' },

  // iPhone 17 Series (2025)
  { id: 'ip-17-pro-max', name: 'iPhone 17 Pro Max', brand: 'Apple', series: 'iPhone 17 Series (2025)' },
  { id: 'ip-17-pro', name: 'iPhone 17 Pro', brand: 'Apple', series: 'iPhone 17 Series (2025)' },
  { id: 'ip-17', name: 'iPhone 17', brand: 'Apple', series: 'iPhone 17 Series (2025)' },
  { id: 'ip-17-air', name: 'iPhone Air', brand: 'Apple', series: 'iPhone 17 Series (2025)' },
  { id: 'ip-17e', name: 'iPhone 17e', brand: 'Apple', series: 'iPhone 17 Series (2025)' },

  // 2024 - iPhone 16 Series
  { id: 'ip-16-pro-max', name: 'iPhone 16 Pro Max', brand: 'Apple', series: 'iPhone 16 Series (2024)' },
  { id: 'ip-16-pro', name: 'iPhone 16 Pro', brand: 'Apple', series: 'iPhone 16 Series (2024)' },
  { id: 'ip-16-plus', name: 'iPhone 16 Plus', brand: 'Apple', series: 'iPhone 16 Series (2024)' },
  { id: 'ip-16', name: 'iPhone 16', brand: 'Apple', series: 'iPhone 16 Series (2024)' },

  // 2023 - iPhone 15 Series
  { id: 'ip-15-pro-max', name: 'iPhone 15 Pro Max', brand: 'Apple', series: 'iPhone 15 Series (2023)' },
  { id: 'ip-15-pro', name: 'iPhone 15 Pro', brand: 'Apple', series: 'iPhone 15 Series (2023)' },
  { id: 'ip-15-plus', name: 'iPhone 15 Plus', brand: 'Apple', series: 'iPhone 15 Series (2023)' },
  { id: 'ip-15', name: 'iPhone 15', brand: 'Apple', series: 'iPhone 15 Series (2023)' },

  // 2022 - iPhone 14 Series
  { id: 'ip-14-pro-max', name: 'iPhone 14 Pro Max', brand: 'Apple', series: 'iPhone 14 Series (2022)' },
  { id: 'ip-14-pro', name: 'iPhone 14 Pro', brand: 'Apple', series: 'iPhone 14 Series (2022)' },
  { id: 'ip-14-plus', name: 'iPhone 14 Plus', brand: 'Apple', series: 'iPhone 14 Series (2022)' },
  { id: 'ip-14', name: 'iPhone 14', brand: 'Apple', series: 'iPhone 14 Series (2022)' },
  { id: 'ip-se-3', name: 'iPhone SE (3rd generation)', brand: 'Apple', series: 'iPhone 14 Series (2022)' },

  // 2021 - iPhone 13 Series
  { id: 'ip-13-pro-max', name: 'iPhone 13 Pro Max', brand: 'Apple', series: 'iPhone 13 Series (2021)' },
  { id: 'ip-13-pro', name: 'iPhone 13 Pro', brand: 'Apple', series: 'iPhone 13 Series (2021)' },
  { id: 'ip-13', name: 'iPhone 13', brand: 'Apple', series: 'iPhone 13 Series (2021)' },
  { id: 'ip-13-mini', name: 'iPhone 13 mini', brand: 'Apple', series: 'iPhone 13 Series (2021)' },

  // Samsung Galaxy Z Fold & Z Flip Series
  { id: 'sam-fold-8-ultra', name: 'Samsung Galaxy Z Fold8 Ultra', brand: 'Samsung', series: 'Galaxy Z Fold8 / Flip8' },
  { id: 'sam-fold-8', name: 'Samsung Galaxy Z Fold8', brand: 'Samsung', series: 'Galaxy Z Fold8 / Flip8' },
  { id: 'sam-flip-8', name: 'Samsung Galaxy Z Flip8', brand: 'Samsung', series: 'Galaxy Z Fold8 / Flip8' },
  { id: 'sam-fold-7', name: 'Samsung Galaxy Z Fold7', brand: 'Samsung', series: 'Galaxy Z Fold Series' },
  { id: 'sam-fold-6', name: 'Samsung Galaxy Z Fold6', brand: 'Samsung', series: 'Galaxy Z Fold Series' },
  { id: 'sam-fold-5', name: 'Samsung Galaxy Z Fold5', brand: 'Samsung', series: 'Galaxy Z Fold Series' },
  { id: 'sam-fold-4', name: 'Samsung Galaxy Z Fold4', brand: 'Samsung', series: 'Galaxy Z Fold Series' },
  { id: 'sam-flip-7', name: 'Samsung Galaxy Z Flip7', brand: 'Samsung', series: 'Galaxy Z Flip Series' },
  { id: 'sam-flip-6', name: 'Samsung Galaxy Z Flip6', brand: 'Samsung', series: 'Galaxy Z Flip Series' },
  { id: 'sam-flip-5', name: 'Samsung Galaxy Z Flip5', brand: 'Samsung', series: 'Galaxy Z Flip Series' },
  { id: 'sam-flip-4', name: 'Samsung Galaxy Z Flip4', brand: 'Samsung', series: 'Galaxy Z Flip Series' },

  // Samsung Galaxy S25 Series
  { id: 'sam-s25-ultra', name: 'Samsung Galaxy S25 Ultra', brand: 'Samsung', series: 'Galaxy S25 Series' },
  { id: 'sam-s25-edge', name: 'Samsung Galaxy S25 Edge', brand: 'Samsung', series: 'Galaxy S25 Series' },
  { id: 'sam-s25-plus', name: 'Samsung Galaxy S25+', brand: 'Samsung', series: 'Galaxy S25 Series' },
  { id: 'sam-s25', name: 'Samsung Galaxy S25', brand: 'Samsung', series: 'Galaxy S25 Series' },

  // Samsung Galaxy S24 Series
  { id: 'sam-s24-ultra', name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', series: 'Galaxy S24 Series' },
  { id: 'sam-s24-plus', name: 'Samsung Galaxy S24+', brand: 'Samsung', series: 'Galaxy S24 Series' },
  { id: 'sam-s24', name: 'Samsung Galaxy S24', brand: 'Samsung', series: 'Galaxy S24 Series' },

  // Samsung Galaxy S23 Series
  { id: 'sam-s23-ultra', name: 'Samsung Galaxy S23 Ultra', brand: 'Samsung', series: 'Galaxy S23 Series' },
  { id: 'sam-s23-plus', name: 'Samsung Galaxy S23+', brand: 'Samsung', series: 'Galaxy S23 Series' },
  { id: 'sam-s23', name: 'Samsung Galaxy S23', brand: 'Samsung', series: 'Galaxy S23 Series' },

  // Samsung Galaxy S22 Series
  { id: 'sam-s22-ultra', name: 'Samsung Galaxy S22 Ultra', brand: 'Samsung', series: 'Galaxy S22 Series' },
  { id: 'sam-s22-plus', name: 'Samsung Galaxy S22+', brand: 'Samsung', series: 'Galaxy S22 Series' },
  { id: 'sam-s22', name: 'Samsung Galaxy S22', brand: 'Samsung', series: 'Galaxy S22 Series' },

  // Samsung Galaxy S21 Series
  { id: 'sam-s21-ultra', name: 'Samsung Galaxy S21 Ultra', brand: 'Samsung', series: 'Galaxy S21 Series' },
  { id: 'sam-s21-plus', name: 'Samsung Galaxy S21+', brand: 'Samsung', series: 'Galaxy S21 Series' },
  { id: 'sam-s21', name: 'Samsung Galaxy S21', brand: 'Samsung', series: 'Galaxy S21 Series' },
];
