import { MonthOption, Region, School } from './types';

export const REGIONS: Region[] = [
  { id: 'seoul', name: '서울특별시' },
  { id: 'busan', name: '부산광역시' },
  { id: 'daegu', name: '대구광역시' },
  { id: 'incheon', name: '인천광역시' },
  { id: 'gwangju', name: '광주광역시' },
  { id: 'daejeon', name: '대전광역시' },
  { id: 'ulsan', name: '울산광역시' },
  { id: 'sejong', name: '세종특별자치시' },
  { id: 'gyeonggi', name: '경기도' },
  { id: 'gangwon', name: '강원특별자치도' },
  { id: 'chungbuk', name: '충청북도' },
  { id: 'chungnam', name: '충청남도' },
  { id: 'jeonbuk', name: '전북특별자치도' },
  { id: 'jeonnam', name: '전라남도' },
  { id: 'gyeongbuk', name: '경상북도' },
  { id: 'gyeongnam', name: '경상남도' },
  { id: 'jeju', name: '제주특별자치도' },
];

export const MONTHS: MonthOption[] = [
  { id: '2026-01', label: '1월' },
  { id: '2026-02', label: '2월' },
  { id: '2026-03', label: '3월' },
  { id: '2026-04', label: '4월' },
  { id: '2026-05', label: '5월' },
  { id: '2026-06', label: '6월' },
  { id: '2026-07', label: '7월' },
  { id: '2026-08', label: '8월' },
  { id: '2026-09', label: '9월' },
  { id: '2026-10', label: '10월' },
  { id: '2026-11', label: '11월' },
  { id: '2026-12', label: '12월' },
];

const monthlyLending = (values: number[]) =>
  MONTHS.reduce(
    (acc, month, index) => {
      acc[month.id] = values[index] ?? 0;
      return acc;
    },
    {} as Record<string, number>,
  );

export const INITIAL_SCHOOLS: School[] = [
  { id: 'seoul', name: '서울공덕초등학교', region: 'seoul', monthlyLending: monthlyLending([42, 36, 55, 63, 58, 51, 43, 39, 66, 72, 61, 48]), latitude: 37.5718, longitude: 126.986 },
  { id: 'busan', name: '연포초등학교', region: 'busan', monthlyLending: monthlyLending([31, 28, 39, 46, 43, 37, 33, 30, 49, 52, 45, 35]), latitude: 35.2048, longitude: 129.0838 },
  { id: 'daegu', name: '대구장동초등학교', region: 'daegu', monthlyLending: monthlyLending([27, 24, 34, 39, 36, 32, 28, 26, 42, 45, 38, 30]), latitude: 35.8724, longitude: 128.5926 },
  { id: 'incheon', name: '인천송도초등학교', region: 'incheon', monthlyLending: monthlyLending([29, 26, 37, 43, 40, 35, 30, 28, 46, 48, 42, 33]), latitude: 37.4755, longitude: 126.6327 },
  { id: 'gwangju', name: '광주서림초등학교', region: 'gwangju', monthlyLending: monthlyLending([24, 21, 31, 36, 34, 29, 25, 23, 38, 41, 35, 27]), latitude: 35.1464, longitude: 126.9222 },
  { id: 'daejeon', name: '대전목동초등학교', region: 'daejeon', monthlyLending: monthlyLending([28, 25, 35, 41, 38, 33, 29, 27, 44, 47, 40, 31]), latitude: 36.3482, longitude: 127.3899 },
  { id: 'ulsan', name: '옥동초등학교', region: 'ulsan', monthlyLending: monthlyLending([25, 22, 32, 37, 35, 30, 26, 24, 39, 42, 36, 28]), latitude: 35.5651, longitude: 129.3208 },
  { id: 'sejong', name: '도담초등학교', region: 'sejong', monthlyLending: monthlyLending([34, 30, 43, 50, 47, 41, 35, 32, 53, 56, 48, 37]), latitude: 36.515, longitude: 127.2546 },
  { id: 'gyeonggi', name: '수원초등학교', region: 'gyeonggi', monthlyLending: monthlyLending([39, 34, 50, 58, 54, 47, 40, 37, 61, 67, 56, 44]), latitude: 37.2706, longitude: 127.0049 },
  { id: 'gangwon', name: '강릉초등학교', region: 'gangwon', monthlyLending: monthlyLending([19, 17, 25, 29, 27, 24, 20, 18, 31, 33, 28, 22]), latitude: 37.8813, longitude: 127.7298 },
  { id: 'chungbuk', name: '충주초등학교', region: 'chungbuk', monthlyLending: monthlyLending([21, 19, 28, 32, 30, 26, 22, 21, 34, 36, 31, 24]), latitude: 36.6357, longitude: 127.4896 },
  { id: 'chungnam', name: '공주초등학교', region: 'chungnam', monthlyLending: monthlyLending([22, 20, 29, 33, 31, 27, 23, 21, 35, 38, 32, 25]), latitude: 36.8065, longitude: 127.1522 },
  { id: 'jeonbuk', name: '전주초등학교', region: 'jeonbuk', monthlyLending: monthlyLending([23, 20, 30, 35, 32, 28, 24, 22, 36, 39, 33, 26]), latitude: 35.8195, longitude: 127.148 },
  { id: 'jeonnam', name: '목포초등학교', region: 'jeonnam', monthlyLending: monthlyLending([20, 18, 26, 30, 28, 24, 21, 19, 32, 34, 29, 23]), latitude: 34.7936, longitude: 126.3828 },
  { id: 'gyeongbuk', name: '영주남부초', region: 'gyeongbuk', monthlyLending: monthlyLending([24, 21, 31, 36, 33, 29, 25, 23, 38, 40, 34, 27]), latitude: 36.8152, longitude: 128.6239 },
  { id: 'gyeongnam', name: '진주초등학교', region: 'gyeongnam', monthlyLending: monthlyLending([26, 23, 33, 38, 36, 31, 27, 25, 41, 44, 37, 29]), latitude: 35.2279, longitude: 128.6811 },
  { id: 'jeju', name: '제주동초등학교', region: 'jeju', monthlyLending: monthlyLending([21, 18, 27, 31, 29, 25, 22, 20, 33, 35, 30, 24]), latitude: 33.5141, longitude: 126.5297 },
];
