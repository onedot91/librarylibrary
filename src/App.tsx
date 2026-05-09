/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { ArrowDownRight, ArrowUpRight, Award, BookOpenText, Cloud, CloudOff, Minus, Plus, Trash2, X } from 'lucide-react';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { INITIAL_SCHOOLS, MONTHS, REGIONS } from './constants';
import {
  deleteBookLoan,
  fetchBookLoans,
  insertBookLoan,
  isSupabaseConfigured,
  supabase,
  toSchoolCountRows,
  type BookLoanRow,
  type SchoolCountRow,
} from './supabase';
import { MonthlySchool, School } from './types';

const geoUrl = '/maps/sido.geojson';
const OUR_SCHOOL_ID = 'daegu';
const STORAGE_KEY = 'jangdong-library-schools-v1';
const RECENT_LOAN_WINDOW_MS = 10 * 60 * 1000;

const getBookLoanErrorMessage = (error: { code?: string; message?: string }) => {
  if (error.code === 'PGRST205' || error.message?.includes("Could not find the table 'public.book_loans'")) {
    return 'Supabase에 book_loans 테이블이 없습니다. supabase-schema.sql을 먼저 실행해주세요.';
  }

  return '책 등록 기록 저장에 실패했습니다.';
};

const compareStudentNumbers = (a: string, b: string) => {
  const aNumber = Number.parseInt(a, 10);
  const bNumber = Number.parseInt(b, 10);

  if (Number.isFinite(aNumber) && Number.isFinite(bNumber) && aNumber !== bNumber) {
    return aNumber - bNumber;
  }

  return a.localeCompare(b, 'ko');
};

type RegionProperties = {
  name?: string;
  name_eng?: string;
  SIDO_NM?: string;
};

type RegionFeature = Feature<Geometry, RegionProperties>;

const regionNameToId = new Map([
  ['서울특별시', 'seoul'],
  ['부산광역시', 'busan'],
  ['대구광역시', 'daegu'],
  ['인천광역시', 'incheon'],
  ['광주광역시', 'gwangju'],
  ['대전광역시', 'daejeon'],
  ['울산광역시', 'ulsan'],
  ['세종특별자치시', 'sejong'],
  ['경기도', 'gyeonggi'],
  ['강원도', 'gangwon'],
  ['강원특별자치도', 'gangwon'],
  ['충청북도', 'chungbuk'],
  ['충청남도', 'chungnam'],
  ['전라북도', 'jeonbuk'],
  ['전북특별자치도', 'jeonbuk'],
  ['전라남도', 'jeonnam'],
  ['경상북도', 'gyeongbuk'],
  ['경상남도', 'gyeongnam'],
  ['제주특별자치도', 'jeju'],
]);

const regionShortNames: Record<string, string> = {
  seoul: '서울',
  busan: '부산',
  daegu: '대구',
  incheon: '인천',
  gwangju: '광주',
  daejeon: '대전',
  ulsan: '울산',
  sejong: '세종',
  gyeonggi: '경기',
  gangwon: '강원',
  chungbuk: '충북',
  chungnam: '충남',
  jeonbuk: '전북',
  jeonnam: '전남',
  gyeongbuk: '경북',
  gyeongnam: '경남',
  jeju: '제주',
};

const regionLabelAdjustments: Record<string, { dx: number; dy: number }> = {
  seoul: { dx: 8, dy: 0 },
  incheon: { dx: -8, dy: 28 },
  gyeonggi: { dx: 40, dy: 40 },
  sejong: { dx: -28, dy: 4 },
  daejeon: { dx: 18, dy: 2 },
  gwangju: { dx: -4, dy: 4 },
  chungnam: { dx: -34, dy: -20 },
  chungbuk: { dx: -4, dy: -18 },
  jeonbuk: { dx: 0, dy: -10 },
  jeonnam: { dx: 34, dy: 10 },
  gyeongbuk: { dx: 18, dy: -20 },
  daegu: { dx: 4, dy: 0 },
  ulsan: { dx: 14, dy: -8 },
  busan: { dx: 10, dy: 10 },
  gyeongnam: { dx: 8, dy: 10 },
  jeju: { dx: 0, dy: -14 },
};

const projection = geoMercator().center([127.8, 36.15]).scale(6300).translate([390, 355]);
const pathGenerator = geoPath(projection);
const dokdoPoint = projection([131 + 52 / 60 + 2.5 / 3600, 37 + 14 / 60 + 28.7 / 3600]);
const reportDate = new Date();

const getMonthId = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const getMonthToDateCount = (monthlyCount: number, date: Date) =>
  Math.round((monthlyCount * date.getDate()) / getDaysInMonth(date));

const getEstimatedMonthlyCount = (monthToDateCount: number, date: Date) =>
  Math.round((Math.max(0, monthToDateCount) * getDaysInMonth(date)) / date.getDate());

const updateSchoolMonthToDateCount = (
  school: School,
  selectedMonth: string,
  count: number,
): School => ({
  ...school,
  monthlyLending: {
    ...school.monthlyLending,
    [selectedMonth]: getEstimatedMonthlyCount(count, reportDate),
  },
});

const getStoredSchools = () => {
  if (typeof window === 'undefined') return INITIAL_SCHOOLS;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_SCHOOLS;

    const parsed = JSON.parse(saved) as School[];
    const savedById = new Map(parsed.map((school) => [school.id, school]));

    return INITIAL_SCHOOLS.map((school) => ({
      ...school,
      monthlyLending: savedById.get(school.id)?.monthlyLending ?? school.monthlyLending,
    }));
  } catch {
    return INITIAL_SCHOOLS;
  }
};

const hasMonthToDateCountChanges = (prev: School[], next: School[], selectedMonth: string) =>
  next.some((school) => {
    const previousSchool = prev.find((item) => item.id === school.id);
    if (!previousSchool) return true;

    return (
      getMonthToDateCount(previousSchool.monthlyLending[selectedMonth] ?? 0, reportDate) !==
      getMonthToDateCount(school.monthlyLending[selectedMonth] ?? 0, reportDate)
    );
  });

const applyRivalGrowth = (
  schools: School[],
  selectedMonth: string,
  eventCount: number,
  responseIntensity = 1,
) => {
  if (eventCount <= 0) return schools;

  let nextSchools = schools;

  for (let i = 0; i < eventCount; i += 1) {
    const ourSchool = nextSchools.find((school) => school.id === OUR_SCHOOL_ID);
    const ourCount = ourSchool
      ? getMonthToDateCount(ourSchool.monthlyLending[selectedMonth] ?? 0, reportDate)
      : 0;
    const rivals = nextSchools
      .filter((school) => school.id !== OUR_SCHOOL_ID)
      .map((school) => ({
        school,
        count: getMonthToDateCount(school.monthlyLending[selectedMonth] ?? 0, reportDate),
      }));
    const leaderCount = Math.max(ourCount, ...rivals.map((rival) => rival.count));
    const isOurSchoolLeading = ourCount >= leaderCount;
    const baseResponseChance = isOurSchoolLeading ? 0.46 : 0.24;
    const responseChance = Math.min(isOurSchoolLeading ? 0.68 : 0.42, baseResponseChance * responseIntensity);

    if (Math.random() > responseChance) continue;

    const weightedRivals = rivals
      .map((rival) => {
        const gapFromUs = rival.count - ourCount;
        const leadGap = leaderCount - ourCount;

        if (gapFromUs >= leadGap && leadGap >= 4) {
          return { ...rival, weight: 0.06 };
        }

        if (gapFromUs >= 1 && gapFromUs <= 3) {
          return { ...rival, weight: 1.4 };
        }

        if (gapFromUs <= 0 && gapFromUs >= -3) {
          return { ...rival, weight: isOurSchoolLeading ? 1.2 : 0.7 };
        }

        return { ...rival, weight: 0.35 };
      })
      .filter((rival) => rival.weight > 0);

    const totalWeight = weightedRivals.reduce((total, rival) => total + rival.weight, 0);
    let pick = Math.random() * totalWeight;
    const selectedRival = weightedRivals.find((rival) => {
      pick -= rival.weight;
      return pick <= 0;
    });

    if (!selectedRival) continue;

    nextSchools = nextSchools.map((school) =>
      school.id === selectedRival.school.id
        ? updateSchoolMonthToDateCount(school, selectedMonth, selectedRival.count + 1)
        : school,
    );
  }

  return nextSchools;
};

const mergeRemoteSchoolRows = (schools: School[], rows: SchoolCountRow[]) => {
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  return schools.map((school) => ({
    ...school,
    monthlyLending: rowsById.get(school.id)?.monthly_lending ?? school.monthlyLending,
  }));
};

const getRelativeRegionColor = (count: number, allCounts: number[]) => {
  const sortedCounts = [...new Set(allCounts)].sort((a, b) => b - a);
  if (sortedCounts.length <= 1) return '#9fcbff';

  const rankRatio = sortedCounts.indexOf(count) / Math.max(1, sortedCounts.length - 1);
  if (rankRatio <= 0.25) return '#0143b5';
  if (rankRatio <= 0.5) return '#4f9df7';
  if (rankRatio <= 0.75) return '#9fcbff';
  return '#d7e8ff';
};

const getRankLabel = (rank: number) => {
  if (rank === 1) return '🥇 1위';
  if (rank === 2) return '🥈 2위';
  if (rank === 3) return '🥉 3위';
  return `🔹 ${rank}위`;
};

const getCompactSchoolName = (name: string) => name;

const getPreviousDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);

const getRankedSchoolsByMonthDate = (schools: School[], monthId: string, date: Date) => {
  const monthlySchools = schools.map((school) => ({
    ...school,
    lendingCount: getMonthToDateCount(school.monthlyLending[monthId] ?? 0, date),
  }));
  const sortedSchools = [...monthlySchools].sort((a, b) => b.lendingCount - a.lendingCount);

  return sortedSchools.map((school) => ({
    ...school,
    rank: sortedSchools.filter((item) => item.lendingCount > school.lendingCount).length + 1,
  }));
};

const RankTrendBadge = ({ change }: { change: number }) => {
  if (change > 0) {
    return (
      <span className="inline-flex h-5 min-w-7 shrink-0 items-center justify-center gap-0.5 rounded-full bg-[#fff0ee] px-1.5 text-[10px] font-black leading-none text-[#d92d20] ring-1 ring-[#ffd0ca]">
        <ArrowUpRight size={12} strokeWidth={3} />
        {change}
      </span>
    );
  }

  if (change < 0) {
    return (
      <span className="inline-flex h-5 min-w-7 shrink-0 items-center justify-center gap-0.5 rounded-full bg-[#eef6ff] px-1.5 text-[10px] font-black leading-none text-[#0064d2] ring-1 ring-[#c7defc]">
        <ArrowDownRight size={12} strokeWidth={3} />
        {Math.abs(change)}
      </span>
    );
  }

  return (
    <span className="inline-flex h-5 min-w-6 shrink-0 items-center justify-center rounded-full bg-white/70 px-1 text-[#8c9aa5] ring-1 ring-[rgba(10,19,23,0.08)]">
      <Minus size={12} strokeWidth={3} />
    </span>
  );
};

const getRegionId = (geo: RegionFeature) => {
  const name = geo.properties.SIDO_NM ?? geo.properties.name;
  return name ? regionNameToId.get(name) ?? '' : '';
};

const simplifyRegionFeature = (geo: RegionFeature): RegionFeature => geo;

const reverseGeometryForD3 = (geometry: Geometry): Geometry => {
  if (geometry.type === 'Polygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((ring) => [...ring].reverse()),
    };
  }

  if (geometry.type === 'MultiPolygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => [...ring].reverse()),
      ),
    };
  }

  return geometry;
};

const KoreaMap = ({
  schools,
  regionalCounts,
  ourRegionId,
}: {
  schools: MonthlySchool[];
  regionalCounts: Record<string, number>;
  ourRegionId?: string;
}) => {
  const [features, setFeatures] = useState<RegionFeature[]>([]);
  const [mapError, setMapError] = useState(false);
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);
  const displayFeatures = useMemo(() => features.map(simplifyRegionFeature), [features]);
  const topRegionIds = useMemo(
    () =>
      Object.entries(regionalCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 3)
        .map(([regionId]) => regionId),
    [regionalCounts],
  );
  const regionCountValues = useMemo(() => Object.values(regionalCounts), [regionalCounts]);
  const regionLabelPoints = useMemo(
    () =>
      new Map(
        displayFeatures
          .map((geo) => {
            const regionId = getRegionId(geo);
            if (!regionId) return null;
            const [x, y] = pathGenerator.centroid(geo);
            const adjustment = regionLabelAdjustments[regionId] ?? { dx: 0, dy: 0 };
            return [regionId, { x: x + adjustment.dx, y: y + adjustment.dy }] as const;
          })
          .filter((item): item is readonly [string, { x: number; y: number }] => Boolean(item)),
      ),
    [displayFeatures],
  );
  const selectedRegionId = hoveredRegionId;
  const isGyeongbukSelected = selectedRegionId === 'gyeongbuk';

  useEffect(() => {
    let cancelled = false;

    fetch(geoUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load map data');
        }
        return response.json() as Promise<FeatureCollection<Geometry, RegionProperties>>;
      })
      .then((collection) => {
        if (cancelled) return;

        setFeatures(
          collection.features.map((geo) => ({
            ...geo,
            geometry: reverseGeometryForD3(geo.geometry),
          })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMapError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (mapError) {
    return (
      <div className="flex h-full items-center justify-center rounded-[32px] bg-[#f5f6f7] text-sm font-semibold text-[#465a69]">
        지도 데이터를 불러오지 못했습니다.
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-[32px] bg-[#f5f6f7] text-sm font-semibold text-[#465a69]">
        지도 데이터를 불러오는 중입니다.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox="42 8 825 735"
        role="img"
        aria-label="대한민국 지역별 도서 대출 현황"
        className="h-full w-full"
        onMouseLeave={() => setHoveredRegionId(null)}
      >
        <g>
        {displayFeatures.map((geo) => {
          const regionId = getRegionId(geo);
          const count = regionalCounts[regionId] || 0;
          const path = pathGenerator(geo);
          const regionName = geo.properties.SIDO_NM ?? geo.properties.name ?? geo.properties.name_eng;
          const isSelected = selectedRegionId === regionId;
          const isTopRegion = topRegionIds.includes(regionId);
          const isOurRegion = ourRegionId === regionId;

          return (
            <path
              key={regionName}
              d={path ?? undefined}
              fill={isSelected ? '#0064e0' : getRelativeRegionColor(count, regionCountValues)}
              stroke={isSelected ? '#0143b5' : '#ffffff'}
              strokeWidth={isSelected ? 2.2 : 1.6}
              className="cursor-pointer transition-colors duration-200"
              onMouseEnter={() => setHoveredRegionId(regionId)}
              onMouseLeave={() => setHoveredRegionId(null)}
            />
          );
        })}
        </g>

        {dokdoPoint && (
        <g
          transform={`translate(${dokdoPoint[0]} ${dokdoPoint[1]}) scale(0.12) translate(${-dokdoPoint[0]} ${-dokdoPoint[1]})`}
        >
          <path
            d={`M ${dokdoPoint[0] - 9} ${dokdoPoint[1] - 2}
              C ${dokdoPoint[0] - 7} ${dokdoPoint[1] - 8}, ${dokdoPoint[0] + 1} ${dokdoPoint[1] - 9}, ${dokdoPoint[0] + 6} ${dokdoPoint[1] - 5}
              C ${dokdoPoint[0] + 11} ${dokdoPoint[1] - 1}, ${dokdoPoint[0] + 8} ${dokdoPoint[1] + 6}, ${dokdoPoint[0] + 1} ${dokdoPoint[1] + 8}
              C ${dokdoPoint[0] - 6} ${dokdoPoint[1] + 10}, ${dokdoPoint[0] - 12} ${dokdoPoint[1] + 4}, ${dokdoPoint[0] - 9} ${dokdoPoint[1] - 2}
              Z`}
            fill={
              isGyeongbukSelected
                ? '#0064e0'
                : getRelativeRegionColor(regionalCounts.gyeongbuk || 0, regionCountValues)
            }
            stroke="#ffffff"
            strokeWidth={1.4}
            className="transition-colors duration-200"
            onMouseEnter={() => setHoveredRegionId('gyeongbuk')}
            onMouseLeave={() => setHoveredRegionId(null)}
          />
          <path
            d={`M ${dokdoPoint[0] + 14} ${dokdoPoint[1] + 1}
              C ${dokdoPoint[0] + 16} ${dokdoPoint[1] - 3}, ${dokdoPoint[0] + 22} ${dokdoPoint[1] - 2}, ${dokdoPoint[0] + 24} ${dokdoPoint[1] + 2}
              C ${dokdoPoint[0] + 26} ${dokdoPoint[1] + 6}, ${dokdoPoint[0] + 21} ${dokdoPoint[1] + 10}, ${dokdoPoint[0] + 16} ${dokdoPoint[1] + 8}
              C ${dokdoPoint[0] + 12} ${dokdoPoint[1] + 6}, ${dokdoPoint[0] + 12} ${dokdoPoint[1] + 3}, ${dokdoPoint[0] + 14} ${dokdoPoint[1] + 1}
              Z`}
            fill={
              isGyeongbukSelected
                ? '#0064e0'
                : getRelativeRegionColor(regionalCounts.gyeongbuk || 0, regionCountValues)
            }
            stroke="#ffffff"
            strokeWidth={1.4}
            className="transition-colors duration-200"
            onMouseEnter={() => setHoveredRegionId('gyeongbuk')}
            onMouseLeave={() => setHoveredRegionId(null)}
          />
        </g>
        )}

        <g>
        {schools.map((school) => {
          const isSelected = selectedRegionId === school.region;
          const isTopRegion = topRegionIds.includes(school.region);
          const isOurRegion = ourRegionId === school.region;
          const shouldShowCount = isSelected || isTopRegion || isOurRegion;
          const label = regionLabelPoints.get(school.region);
          if (!label) return null;

          if (school.region === 'daegu') {
            return (
              <g key={school.id} transform={`translate(${label.x} ${label.y})`} className="pointer-events-none">
                <line
                  x1={8}
                  y1={-4}
                  x2={52}
                  y2={-34}
                  stroke="#0143b5"
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.72}
                />
                <g transform="translate(52 -70)">
                  <rect
                    width={116}
                    height={70}
                    rx={18}
                    fill="#ffffff"
                    stroke="#0143b5"
                    strokeWidth={2}
                    filter="drop-shadow(0 8px 14px rgba(10, 19, 23, 0.14))"
                  />
                  <text
                    x={58}
                    y={27}
                    textAnchor="middle"
                    className="fill-[#0a1317] text-[17px] font-black"
                  >
                    {regionShortNames[school.region] ?? school.region}
                  </text>
                  <text
                    x={58}
                    y={55}
                    textAnchor="middle"
                    className="fill-[#0143b5] text-[24px] font-black"
                  >
                    {school.lendingCount.toLocaleString()}권
                  </text>
                </g>
              </g>
            );
          }

          return (
            <g
              key={school.id}
              transform={`translate(${label.x} ${label.y})`}
              className="pointer-events-none"
            >
              <text
                textAnchor="middle"
                paintOrder="stroke"
                stroke="#ffffff"
                strokeWidth={3.2}
                strokeLinejoin="round"
                className={
                  isSelected || isOurRegion || isTopRegion
                    ? 'fill-[#0143b5] text-[18px] font-black'
                    : 'fill-[#0a1317] text-[13px] font-black'
                }
              >
                {regionShortNames[school.region] ?? school.region}
              </text>
              {shouldShowCount && (
                <text
                  y={31}
                  textAnchor="middle"
                  paintOrder="stroke"
                  stroke="#ffffff"
                  strokeWidth={3.2}
                  strokeLinejoin="round"
                  className={
                    isSelected || isOurRegion
                      ? 'fill-[#0143b5] text-[26px] font-black'
                      : 'fill-[#0a1317] text-[20px] font-black'
                  }
                >
                  {school.lendingCount.toLocaleString()}권
                </text>
              )}
            </g>
          );
        })}
        </g>
      </svg>
    </div>
  );
};

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <section
    className={`rounded-[32px] border border-[rgba(10,19,23,0.08)] bg-white ${className}`}
  >
    {children}
  </section>
);

const DataSettingsModal = ({
  bookLoans,
  bookLoanReviewError,
  schools,
  selectedMonth,
  onClose,
  onDeleteBookLoan,
  onUpdate,
}: {
  bookLoans: BookLoanRow[];
  bookLoanReviewError: string;
  schools: School[];
  selectedMonth: string;
  onClose: () => void;
  onDeleteBookLoan: (loan: BookLoanRow) => void;
  onUpdate: (id: string, count: number) => void;
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'review'>('edit');
  const loansByStudentNumber = useMemo(
    () =>
      Object.entries(
        bookLoans.reduce<Record<string, BookLoanRow[]>>((groups, loan) => {
          const studentNumber = loan.student_number.trim() || '미입력';
          groups[studentNumber] = [...(groups[studentNumber] ?? []), loan];
          return groups;
        }, {}),
      ).sort(([a], [b]) => compareStudentNumbers(a, b)),
    [bookLoans],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <section className="flex max-h-[86vh] w-full max-w-2xl flex-col rounded-[32px] border border-[rgba(10,19,23,0.08)] bg-white shadow-[rgba(20,22,26,0.3)_0px_1px_4px_0px]">
        <header className="flex items-start justify-between gap-4 border-b border-[rgba(10,19,23,0.08)] px-8 py-6">
          <div>
            <h2 className="text-2xl font-medium text-[#0a1317]">데이터 수정</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-[#465a69]">
              오늘 기준 학교별 대출 권수와 등록 기록을 확인합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="설정창 닫기"
            className="rounded-full p-2 text-[#465a69] transition hover:bg-[#f5f6f7] hover:text-[#0a1317] active:scale-95"
          >
            <X size={22} />
          </button>
        </header>
        <div className="border-b border-[rgba(10,19,23,0.08)] px-8 pt-4">
          <div className="inline-flex rounded-xl bg-[#eef1f4] p-1">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`h-10 rounded-lg px-4 text-sm font-black transition ${
                activeTab === 'edit' ? 'bg-white text-[#0a1317] shadow-sm' : 'text-[#637381] hover:text-[#0a1317]'
              }`}
            >
              대출 권수 수정
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('review')}
              className={`h-10 rounded-lg px-4 text-sm font-black transition ${
                activeTab === 'review' ? 'bg-white text-[#0a1317] shadow-sm' : 'text-[#637381] hover:text-[#0a1317]'
              }`}
            >
              데이터 검토
            </button>
          </div>
        </div>
        <div className="overflow-y-auto px-8 py-6">
          {activeTab === 'edit' ? (
            <div className="space-y-3">
              {schools.map((school) => {
                const region = REGIONS.find((item) => item.id === school.region);

                return (
                  <label
                    key={school.id}
                    className="grid grid-cols-[minmax(0,1fr)_112px] items-center gap-4 rounded-2xl border border-[rgba(10,19,23,0.08)] bg-[#f5f6f7] px-4 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-[#0a1317]">{school.name}</span>
                      <span className="block text-xs font-medium text-[#637381]">{region?.name}</span>
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={getMonthToDateCount(school.monthlyLending[selectedMonth] ?? 0, reportDate)}
                      onChange={(event) =>
                        onUpdate(school.id, Number.parseInt(event.target.value, 10) || 0)
                      }
                      className="h-11 w-full rounded-lg border border-[rgba(10,19,23,0.12)] bg-white p-2 text-right font-black text-[#0a1317] outline-none transition focus:border-2 focus:border-[#0866ff]"
                    />
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {bookLoanReviewError && (
                <p className="rounded-2xl bg-[#fff1f1] px-4 py-3 text-sm font-bold leading-5 text-[#c62828]">
                  {bookLoanReviewError}
                </p>
              )}
              {!bookLoanReviewError && loansByStudentNumber.length === 0 && (
                <p className="rounded-2xl bg-[#f5f6f7] px-4 py-5 text-sm font-bold text-[#637381]">
                  등록된 책 데이터가 없습니다.
                </p>
              )}
              {loansByStudentNumber.map(([studentNumber, loans]) => (
                <section
                  key={studentNumber}
                  className="rounded-2xl border border-[rgba(10,19,23,0.08)] bg-[#f5f6f7] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-black text-[#0a1317]">{studentNumber}번</h3>
                    <span className="text-xs font-black text-[#0143b5]">{loans.length}권</span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {loans.map((loan) => (
                      <li
                        key={loan.id}
                        className="rounded-xl border border-[rgba(10,19,23,0.08)] bg-white px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <p className="truncate text-sm font-black text-[#0a1317]">{loan.title}</p>
                            <p className="mt-1 truncate text-xs font-bold text-[#637381]">{loan.author}</p>
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteBookLoan(loan)}
                            aria-label={`${loan.title} 삭제`}
                            title="삭제"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#c62828] transition hover:bg-[#fff1f1] active:scale-95"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const BookLoanModal = ({
  bookAuthor,
  errorMessage,
  studentNumber,
  bookTitle,
  onBookAuthorChange,
  onStudentNumberChange,
  onBookTitleChange,
  onClose,
  onSubmit,
}: {
  bookAuthor: string;
  errorMessage: string;
  studentNumber: string;
  bookTitle: string;
  onBookAuthorChange: (author: string) => void;
  onStudentNumberChange: (studentNumber: string) => void;
  onBookTitleChange: (title: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <section className="w-full max-w-md rounded-[32px] border border-[rgba(10,19,23,0.08)] bg-white shadow-[rgba(20,22,26,0.3)_0px_1px_4px_0px]">
      <header className="flex items-start justify-between gap-4 border-b border-[rgba(10,19,23,0.08)] px-6 py-5">
        <h2 className="text-2xl font-medium text-[#0a1317]">빌린 책 등록</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="책 등록창 닫기"
          className="rounded-full p-2 text-[#465a69] transition hover:bg-[#f5f6f7] hover:text-[#0a1317] active:scale-95"
        >
          <X size={22} />
        </button>
      </header>
      <form
        className="p-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="block text-sm font-black text-[#0a1317]" htmlFor="student-number-modal">
          자신의 번호
        </label>
        <input
          id="student-number-modal"
          type="text"
          inputMode="numeric"
          autoFocus
          value={studentNumber}
          onChange={(event) => onStudentNumberChange(event.target.value)}
          placeholder="자신의 번호를 입력하세요"
          className="mt-3 h-12 w-full min-w-0 rounded-xl border border-[rgba(10,19,23,0.12)] bg-white px-3 text-base font-bold text-[#0a1317] outline-none transition placeholder:text-[#8c9aa5] focus:border-2 focus:border-[#0866ff]"
        />
        <label className="mt-4 block text-sm font-black text-[#0a1317]" htmlFor="book-title-modal">
          책 제목
        </label>
        <input
          id="book-title-modal"
          type="text"
          value={bookTitle}
          onChange={(event) => onBookTitleChange(event.target.value)}
          placeholder="책 제목을 입력하세요"
          className="mt-3 h-12 w-full min-w-0 rounded-xl border border-[rgba(10,19,23,0.12)] bg-white px-3 text-base font-bold text-[#0a1317] outline-none transition placeholder:text-[#8c9aa5] focus:border-2 focus:border-[#0866ff]"
        />
        <label className="mt-4 block text-sm font-black text-[#0a1317]" htmlFor="book-author-modal">
          글쓴이
        </label>
        <input
          id="book-author-modal"
          type="text"
          value={bookAuthor}
          onChange={(event) => onBookAuthorChange(event.target.value)}
          placeholder="글쓴이를 입력하세요"
          className="mt-3 h-12 w-full min-w-0 rounded-xl border border-[rgba(10,19,23,0.12)] bg-white px-3 text-base font-bold text-[#0a1317] outline-none transition placeholder:text-[#8c9aa5] focus:border-2 focus:border-[#0866ff]"
        />
        {errorMessage && (
          <p className="mt-3 text-sm font-bold leading-5 text-[#c62828]">{errorMessage}</p>
        )}
        <button
          type="submit"
          disabled={!studentNumber.trim() || !bookTitle.trim() || !bookAuthor.trim()}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0143b5] px-4 text-sm font-black text-white transition hover:bg-[#0064e0] active:scale-95 disabled:cursor-not-allowed disabled:bg-[#aebbd0] disabled:active:scale-100"
        >
          <Plus size={18} />
          1권 등록
        </button>
      </form>
    </section>
  </div>
);

export default function App() {
  const [schools, setSchools] = useState<School[]>(getStoredSchools);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBookLoanModalOpen, setIsBookLoanModalOpen] = useState(false);
  const [bookAuthor, setBookAuthor] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookLoans, setBookLoans] = useState<BookLoanRow[]>([]);
  const [bookLoanReviewError, setBookLoanReviewError] = useState('');
  const [loanSubmitError, setLoanSubmitError] = useState('');
  const [syncStatus, setSyncStatus] = useState(
    isSupabaseConfigured ? '공유 DB 연결 중' : '로컬 저장 모드',
  );
  const settingsClickCountRef = useRef(0);
  const recentLoanTimestampsRef = useRef<number[]>([]);
  const rivalResponseTimeoutsRef = useRef<number[]>([]);
  const selectedMonth = getMonthId(reportDate);
  const previousDate = getPreviousDate(reportDate);
  const selectedMonthLabel = MONTHS.find((month) => month.id === selectedMonth)?.label ?? '';

  const persistSchools = (nextSchools: School[]) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSchools));

    if (!supabase) return;

    supabase
      .from('school_lending_counts')
      .upsert(toSchoolCountRows(nextSchools), { onConflict: 'id' })
      .then(({ error }) => {
        setSyncStatus(error ? '공유 DB 저장 실패' : '실시간 공유 중');
      });
  };

  const loadBookLoans = async () => {
    const { data, error } = await fetchBookLoans(OUR_SCHOOL_ID);

    if (error) {
      console.error('Book loan fetch failed:', error);
      setBookLoanReviewError(getBookLoanErrorMessage(error));
      return;
    }

    setBookLoanReviewError('');
    setBookLoans((data ?? []) as BookLoanRow[]);
  };

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schools));
  }, [schools]);

  useEffect(() => {
    loadBookLoans();
  }, []);

  useEffect(
    () => () => {
      rivalResponseTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      rivalResponseTimeoutsRef.current = [];
    },
    [],
  );

  useEffect(() => {
    if (!supabase) return undefined;

    let ignore = false;

    supabase
      .from('school_lending_counts')
      .select('id, monthly_lending, updated_at')
      .then(({ data, error }) => {
        if (ignore) return;

        if (error) {
          setSyncStatus('공유 DB 불러오기 실패');
          return;
        }

        if (!data || data.length === 0) {
          persistSchools(INITIAL_SCHOOLS);
          setSyncStatus('공유 DB 초기화 중');
          return;
        }

        setSchools((prev) => mergeRemoteSchoolRows(prev, data as SchoolCountRow[]));
        setSyncStatus('실시간 공유 중');
      });

    const channel = supabase
      .channel('school-lending-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'school_lending_counts',
        },
        (payload) => {
          const row = payload.new as SchoolCountRow | null;
          if (!row?.id) return;

          setSchools((prev) =>
            prev.map((school) =>
              school.id === row.id
                ? {
                    ...school,
                    monthlyLending: row.monthly_lending,
                  }
                : school,
            ),
          );
          setSyncStatus('실시간 공유 중');
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus('실시간 공유 중');
        }
      });

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const monthlySchools = useMemo<MonthlySchool[]>(
    () =>
      schools.map((school) => ({
        ...school,
        lendingCount: getMonthToDateCount(school.monthlyLending[selectedMonth] ?? 0, reportDate),
      })),
    [schools, selectedMonth],
  );

  const sortedSchools = useMemo(
    () => [...monthlySchools].sort((a, b) => b.lendingCount - a.lendingCount),
    [monthlySchools],
  );
  const rankedSchools = useMemo(
    () =>
      sortedSchools.map((school) => ({
        ...school,
        rank: sortedSchools.filter((item) => item.lendingCount > school.lendingCount).length + 1,
      })),
    [sortedSchools],
  );
  const previousRankBySchoolId = useMemo(
    () =>
      new Map(
        getRankedSchoolsByMonthDate(schools, selectedMonth, previousDate).map((school) => [
          school.id,
          school.rank,
        ]),
      ),
    [previousDate, schools, selectedMonth],
  );

  const regionalCounts = useMemo(
    () =>
      monthlySchools.reduce(
        (acc, school) => {
          acc[school.region] = (acc[school.region] || 0) + school.lendingCount;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [monthlySchools],
  );

  const ourSchool = monthlySchools.find((school) => school.id === OUR_SCHOOL_ID);
  const ourSchoolRank = rankedSchools.find((school) => school.id === ourSchool?.id)?.rank ?? 0;
  const ourSchoolCount = ourSchool?.lendingCount ?? 0;

  const scheduleRivalResponse = (delayOffset = 0) => {
    const now = Date.now();
    recentLoanTimestampsRef.current = [...recentLoanTimestampsRef.current, now].filter(
      (timestamp) => now - timestamp <= RECENT_LOAN_WINDOW_MS,
    );

    const recentLoanCount = recentLoanTimestampsRef.current.length;
    const responseIntensity = Math.min(1.45, 0.85 + recentLoanCount * 0.12);
    const delay = delayOffset + Math.max(9000, 18000 + Math.floor(Math.random() * 42000) - recentLoanCount * 1800);

    const timeoutId = window.setTimeout(() => {
      setSchools((prev) => {
        const next = applyRivalGrowth(prev, selectedMonth, 1, responseIntensity);
        if (!hasMonthToDateCountChanges(prev, next, selectedMonth)) return prev;

        persistSchools(next);
        return next;
      });

      rivalResponseTimeoutsRef.current = rivalResponseTimeoutsRef.current.filter((id) => id !== timeoutId);
    }, delay);

    rivalResponseTimeoutsRef.current = [...rivalResponseTimeoutsRef.current, timeoutId];
  };

  const updateLendingCount = (id: string, newCount: number) => {
    const previousOurSchool = schools.find((school) => school.id === OUR_SCHOOL_ID);
    const previousOurCount = previousOurSchool
      ? getMonthToDateCount(previousOurSchool.monthlyLending[selectedMonth] ?? 0, reportDate)
      : 0;
    const next = schools.map((school) =>
      school.id === id ? updateSchoolMonthToDateCount(school, selectedMonth, newCount) : school,
    );
    const ourIncrease = id === OUR_SCHOOL_ID ? Math.max(0, newCount - previousOurCount) : 0;

    setSchools(next);
    persistSchools(next);

    if (ourIncrease > 0) {
      Array.from({ length: Math.min(ourIncrease, 5) }).forEach((_, index) => {
        scheduleRivalResponse(index * 18000);
      });
    }
  };

  const addOurSchoolLoan = async () => {
    const author = bookAuthor.trim();
    const normalizedStudentNumber = studentNumber.trim();
    const title = bookTitle.trim();
    if (!normalizedStudentNumber || !title || !author) return;

    setLoanSubmitError('');

    const { data, error } = await insertBookLoan({
      school_id: OUR_SCHOOL_ID,
      student_number: normalizedStudentNumber,
      title,
      author,
    });

    if (error) {
      console.error('Book loan insert failed:', error);
      setLoanSubmitError(getBookLoanErrorMessage(error));
      return;
    }

    if (data) {
      setBookLoans((prev) => [data as BookLoanRow, ...prev]);
      setBookLoanReviewError('');
    }

    setSchools((prev) => {
      const next = prev.map((school) => {
        if (school.id !== OUR_SCHOOL_ID) return school;

        const currentCount = getMonthToDateCount(school.monthlyLending[selectedMonth] ?? 0, reportDate);
        return updateSchoolMonthToDateCount(school, selectedMonth, currentCount + 1);
      });
      persistSchools(next);
      return next;
    });
    scheduleRivalResponse();
    setBookAuthor('');
    setStudentNumber('');
    setBookTitle('');
    setIsBookLoanModalOpen(false);
  };

  const removeOurSchoolLoan = async (loan: BookLoanRow) => {
    setBookLoanReviewError('');

    const { error } = await deleteBookLoan(loan.id);

    if (error) {
      console.error('Book loan delete failed:', error);
      setBookLoanReviewError(getBookLoanErrorMessage(error));
      return;
    }

    setBookLoans((prev) => prev.filter((item) => item.id !== loan.id));
    setSchools((prev) => {
      const next = prev.map((school) => {
        if (school.id !== OUR_SCHOOL_ID) return school;

        const currentCount = getMonthToDateCount(school.monthlyLending[selectedMonth] ?? 0, reportDate);
        return updateSchoolMonthToDateCount(school, selectedMonth, Math.max(0, currentCount - 1));
      });
      persistSchools(next);
      return next;
    });
  };

  const handleSettingsIconClick = () => {
    settingsClickCountRef.current += 1;

    if (settingsClickCountRef.current < 10) return;

    settingsClickCountRef.current = 0;
    setIsSettingsOpen(true);
  };

  return (
    <main className="min-h-screen overflow-y-auto bg-white font-sans text-[#0a1317] xl:h-screen xl:overflow-hidden">
      <header className="border-b border-[rgba(10,19,23,0.08)] bg-white px-4 py-4 md:px-6 xl:px-10">
        <div className="mx-auto flex max-w-[1680px] items-center">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={handleSettingsIconClick}
              aria-label="데이터 수정"
              title="데이터 수정"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#0a1317] text-white transition hover:bg-[#0143b5] active:scale-95"
            >
              <BookOpenText size={30} />
            </button>
            <div>
              <h1 className="text-2xl font-medium leading-tight text-[#0a1317] md:text-3xl">
                전국 3학년 3반 도서관 대출 현황 대항전
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1680px] grid-cols-1 gap-4 px-4 py-5 md:px-6 xl:h-[calc(100vh-93px)] xl:grid-cols-[minmax(0,1fr)_380px] xl:px-10">
        <Card className="flex min-h-[720px] flex-col p-3 xl:min-h-0">
          <div className="relative min-h-0 flex-1 rounded-[32px] bg-[#f5f6f7] p-1">
            <span
              aria-label={syncStatus}
              title={syncStatus}
              className={`absolute right-5 top-5 z-10 grid h-9 w-9 place-items-center rounded-full opacity-45 ring-1 ${
                syncStatus === '실시간 공유 중'
                  ? 'bg-white/70 text-[#5d84bd] ring-[rgba(93,132,189,0.16)]'
                  : 'bg-white/70 text-[#8c9aa5] ring-[rgba(10,19,23,0.08)]'
              }`}
            >
              {syncStatus === '실시간 공유 중' ? <Cloud size={18} /> : <CloudOff size={18} />}
            </span>
            <KoreaMap
              schools={sortedSchools}
              regionalCounts={regionalCounts}
              ourRegionId={ourSchool?.region}
            />
            <div className="pointer-events-none absolute bottom-5 right-5 rounded-[24px] bg-white/88 px-4 py-3 text-xs font-black text-[#465a69] ring-1 ring-[rgba(10,19,23,0.08)] backdrop-blur">
              <div className="grid grid-cols-1 gap-2">
                <p className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-[#0143b5]" />
                  가장 많음
                </p>
                <p className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-[#4f9df7]" />
                  많음
                </p>
                <p className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-[#9fcbff]" />
                  보통
                </p>
                <p className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-[#d7e8ff]" />
                  적음
                </p>
              </div>
            </div>
          </div>
        </Card>

        <aside className="flex min-h-0 flex-col gap-4">
          <Card className="p-4">
            <button
              type="button"
              onClick={() => {
                setLoanSubmitError('');
                setIsBookLoanModalOpen(true);
              }}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[#0143b5] px-4 text-base font-black text-white transition hover:bg-[#0064e0] active:scale-95"
            >
              <Plus size={20} />
              등록하기
            </button>
          </Card>

          <Card className="p-4">
            <div className="rounded-[20px] bg-[#f5f6f7] p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-sm font-bold text-[#465a69]">대구장동초등학교</p>
                {ourSchoolRank > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[100px] border border-[#2f80d1] bg-white/70 px-3 py-1 text-sm font-black leading-none text-[#005eb8]">
                    {selectedMonthLabel} {getRankLabel(ourSchoolRank)}
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="text-5xl font-black leading-none tracking-[-0.16px] text-[#0143b5]">
                  {ourSchoolCount.toLocaleString()}권
                </p>
              </div>
              <p className="mt-3 text-sm font-semibold leading-5 text-[#637381]">
                우리 반 {selectedMonthLabel} 누적 대출 권수
              </p>
              </div>
          </Card>

          <Card className="flex min-h-[520px] flex-1 flex-col p-5 xl:min-h-0">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-medium text-[#0a1317]">
              <Award className="text-[#0143b5]" />
              {selectedMonthLabel} 독서 랭킹
            </h2>
            <ol className="flex flex-1 flex-col justify-between gap-3">
              {rankedSchools.slice(0, 5).map((school) => {
                const isOurSchool = school.id === ourSchool?.id;
                const previousRank = previousRankBySchoolId.get(school.id) ?? school.rank;
                const rankChange = previousRank - school.rank;

                return (
                  <li
                    key={school.id}
                    className={`rounded-2xl px-3 py-3 ${
                      isOurSchool
                        ? 'bg-[#eef5ff] ring-2 ring-[#0143b5]'
                        : 'bg-[#f5f6f7]'
                    }`}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-[#0a1317]">
                        <span className="shrink-0">{getRankLabel(school.rank)}</span>
                        <RankTrendBadge change={rankChange} />
                        <span className="min-w-0 truncate">{getCompactSchoolName(school.name)}</span>
                      </span>
                      <span className="text-sm font-black tabular-nums text-[#0a1317]">
                        {school.lendingCount.toLocaleString()}권
                      </span>
                      <span className="rounded-[50px] border border-[#2f80d1] px-2.5 py-0.5 text-xs font-black text-[#005eb8]">
                        {regionShortNames[school.region] ?? school.region}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </aside>
      </div>

      {isSettingsOpen && (
        <DataSettingsModal
          bookLoans={bookLoans}
          bookLoanReviewError={bookLoanReviewError}
          schools={schools}
          selectedMonth={selectedMonth}
          onClose={() => setIsSettingsOpen(false)}
          onDeleteBookLoan={removeOurSchoolLoan}
          onUpdate={updateLendingCount}
        />
      )}

      {isBookLoanModalOpen && (
        <BookLoanModal
          bookAuthor={bookAuthor}
          errorMessage={loanSubmitError}
          studentNumber={studentNumber}
          bookTitle={bookTitle}
          onBookAuthorChange={setBookAuthor}
          onStudentNumberChange={setStudentNumber}
          onBookTitleChange={setBookTitle}
          onClose={() => {
            setBookAuthor('');
            setStudentNumber('');
            setBookTitle('');
            setLoanSubmitError('');
            setIsBookLoanModalOpen(false);
          }}
          onSubmit={addOurSchoolLoan}
        />
      )}
    </main>
  );
}
