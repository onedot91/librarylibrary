export interface School {
  id: string;
  name: string;
  region: string;
  monthlyLending: Record<string, number>;
  latitude: number;
  longitude: number;
}

export interface MonthlySchool extends School {
  lendingCount: number;
}

export interface Region {
  id: string;
  name: string;
}

export interface MonthOption {
  id: string;
  label: string;
}
