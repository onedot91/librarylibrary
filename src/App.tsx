/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { Award, BookOpenText, Settings2, X } from 'lucide-react';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { INITIAL_SCHOOLS, MONTHS, REGIONS } from './constants';
import { MonthlySchool, School } from './types';

const geoUrl = '/maps/sido.geojson';

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
const reportDate = new Date(2026, 4, 9);

const getMonthId = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const getMonthToDateCount = (monthlyCount: number, date: Date) =>
  Math.round((monthlyCount * date.getDate()) / getDaysInMonth(date));

const getRegionColor = (count: number) => {
  if (count >= 17) return '#0143b5';
  if (count >= 13) return '#4f9df7';
  if (count >= 9) return '#9fcbff';
  return '#d7e8ff';
};

const getRankLabel = (rank: number) => {
  if (rank === 1) return '🥇 1위';
  if (rank === 2) return '🥈 2위';
  if (rank === 3) return '🥉 3위';
  return `🔹 ${rank}위`;
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
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const displayFeatures = useMemo(() => features.map(simplifyRegionFeature), [features]);
  const topRegionIds = useMemo(
    () =>
      Object.entries(regionalCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 3)
        .map(([regionId]) => regionId),
    [regionalCounts],
  );
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
  const selectedRegionId = hoveredRegionId ?? activeRegionId;
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
              fill={isSelected ? '#0064e0' : getRegionColor(count)}
              stroke={isSelected ? '#0143b5' : '#ffffff'}
              strokeWidth={isSelected ? 2.2 : 1.6}
              className="cursor-pointer transition-colors duration-200"
              onMouseEnter={() => setHoveredRegionId(regionId)}
              onMouseLeave={() => setHoveredRegionId(null)}
              onClick={() => setActiveRegionId((current) => (current === regionId ? null : regionId))}
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
            fill={isGyeongbukSelected ? '#0064e0' : getRegionColor(regionalCounts.gyeongbuk || 0)}
            stroke="#ffffff"
            strokeWidth={1.4}
            className="transition-colors duration-200"
            onMouseEnter={() => setHoveredRegionId('gyeongbuk')}
            onMouseLeave={() => setHoveredRegionId(null)}
            onClick={() => setActiveRegionId((current) => (current === 'gyeongbuk' ? null : 'gyeongbuk'))}
          />
          <path
            d={`M ${dokdoPoint[0] + 14} ${dokdoPoint[1] + 1}
              C ${dokdoPoint[0] + 16} ${dokdoPoint[1] - 3}, ${dokdoPoint[0] + 22} ${dokdoPoint[1] - 2}, ${dokdoPoint[0] + 24} ${dokdoPoint[1] + 2}
              C ${dokdoPoint[0] + 26} ${dokdoPoint[1] + 6}, ${dokdoPoint[0] + 21} ${dokdoPoint[1] + 10}, ${dokdoPoint[0] + 16} ${dokdoPoint[1] + 8}
              C ${dokdoPoint[0] + 12} ${dokdoPoint[1] + 6}, ${dokdoPoint[0] + 12} ${dokdoPoint[1] + 3}, ${dokdoPoint[0] + 14} ${dokdoPoint[1] + 1}
              Z`}
            fill={isGyeongbukSelected ? '#0064e0' : getRegionColor(regionalCounts.gyeongbuk || 0)}
            stroke="#ffffff"
            strokeWidth={1.4}
            className="transition-colors duration-200"
            onMouseEnter={() => setHoveredRegionId('gyeongbuk')}
            onMouseLeave={() => setHoveredRegionId(null)}
            onClick={() => setActiveRegionId((current) => (current === 'gyeongbuk' ? null : 'gyeongbuk'))}
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

const PillButton = ({
  children,
  className = '',
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className={`inline-flex items-center justify-center gap-2 rounded-[100px] px-[30px] py-[14px] text-sm font-bold tracking-[-0.14px] transition duration-200 active:scale-95 ${className}`}
  >
    {children}
  </button>
);

const DataSettingsModal = ({
  schools,
  selectedMonth,
  onClose,
  onUpdate,
}: {
  schools: School[];
  selectedMonth: string;
  onClose: () => void;
  onUpdate: (id: string, count: number) => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <section className="flex max-h-[86vh] w-full max-w-2xl flex-col rounded-[32px] border border-[rgba(10,19,23,0.08)] bg-white shadow-[rgba(20,22,26,0.3)_0px_1px_4px_0px]">
      <header className="flex items-start justify-between gap-4 border-b border-[rgba(10,19,23,0.08)] px-8 py-6">
        <div>
          <h2 className="text-2xl font-medium text-[#0a1317]">데이터 수정</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-[#465a69]">
            오늘 기준 학교별 대출 권수를 바꾸면 지도와 순위가 바로 갱신됩니다.
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
      <div className="overflow-y-auto px-8 py-6">
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
      </div>
    </section>
  </div>
);

export default function App() {
  const [schools, setSchools] = useState<School[]>(INITIAL_SCHOOLS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const selectedMonth = getMonthId(reportDate);
  const selectedMonthLabel = MONTHS.find((month) => month.id === selectedMonth)?.label ?? '';

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

  const totalLendingCount = monthlySchools.reduce((total, school) => total + school.lendingCount, 0);
  const ourSchool = monthlySchools.find((school) => school.name === '대구장동초등학교');
  const ourSchoolRank = rankedSchools.find((school) => school.id === ourSchool?.id)?.rank ?? 0;
  const ourSchoolCount = ourSchool?.lendingCount ?? 0;

  const updateLendingCount = (id: string, newCount: number) => {
    const estimatedMonthlyCount = Math.round((Math.max(0, newCount) * getDaysInMonth(reportDate)) / reportDate.getDate());

    setSchools((prev) =>
      prev.map((school) =>
        school.id === id
          ? {
              ...school,
              monthlyLending: {
                ...school.monthlyLending,
                [selectedMonth]: estimatedMonthlyCount,
              },
            }
          : school,
      ),
    );
  };

  return (
    <main className="min-h-screen overflow-y-auto bg-white font-sans text-[#0a1317] xl:h-screen xl:overflow-hidden">
      <header className="border-b border-[rgba(10,19,23,0.08)] bg-white px-4 py-4 md:px-6 xl:px-10">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#0a1317] text-white">
              <BookOpenText size={30} />
            </div>
            <div>
              <h1 className="text-2xl font-medium leading-tight text-[#0a1317] md:text-3xl">
                전국 3학년 3반 도서관 대출 현황 대항전
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-5 md:justify-end">
            <div className="grid grid-cols-2 gap-5 text-right">
              <div>
                <p className="text-xs font-semibold uppercase text-[#637381]">5월 누적 대출 권수</p>
                <p className="text-2xl font-black text-[#0143b5]">{totalLendingCount.toLocaleString()}권</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#637381]">참여 학교</p>
                <p className="text-2xl font-black text-[#0a1317]">{schools.length}곳</p>
              </div>
            </div>
            <PillButton
              onClick={() => setIsSettingsOpen(true)}
              className="border border-[rgba(10,19,23,0.12)] bg-white text-[#0a1317] hover:bg-[#f5f6f7]"
            >
              <Settings2 size={18} />
              데이터 수정
            </PillButton>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1680px] grid-cols-1 gap-4 px-4 py-5 md:px-6 xl:h-[calc(100vh-93px)] xl:grid-cols-[minmax(0,1fr)_320px] xl:px-10">
        <Card className="flex min-h-[720px] flex-col p-3 xl:min-h-0">
          <div className="relative min-h-0 flex-1 rounded-[32px] bg-[#f5f6f7] p-1">
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

        <aside className="min-h-0 space-y-4">
          <Card className="p-4">
            <div className="mb-3">
              <h2 className="text-xl font-medium text-[#0a1317]">우리 학교 현황</h2>
            </div>
            <div className="rounded-[20px] bg-[#f5f6f7] p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-sm font-bold text-[#465a69]">대구장동초등학교</p>
                {ourSchoolRank > 0 && (
                  <span className="shrink-0 rounded-[100px] border border-[#2f80d1] px-3 py-1 text-xs font-black text-[#005eb8]">
                    {getRankLabel(ourSchoolRank)}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="text-5xl font-black leading-none tracking-[-0.16px] text-[#0143b5]">
                  {ourSchoolCount.toLocaleString()}권
                </p>
              </div>
              <p className="mt-3 text-sm font-semibold leading-5 text-[#637381]">
                우리 반 누적 대출 권수
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-medium text-[#0a1317]">
              <Award className="text-[#0143b5]" />
              {selectedMonthLabel} 독서 랭킹
            </h2>
            <ol className="space-y-3">
              {rankedSchools.slice(0, 5).map((school) => {
                const isOurSchool = school.id === ourSchool?.id;

                return (
                  <li
                    key={school.id}
                    className={`rounded-2xl p-3 ${
                      isOurSchool
                        ? 'bg-[#eef5ff] ring-2 ring-[#0143b5]'
                        : 'bg-[#f5f6f7]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-sm font-bold text-[#0a1317]">
                        {getRankLabel(school.rank)} {school.name}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-[50px] border border-[#2f80d1] px-3 py-1 text-sm font-black text-[#005eb8]">
                          {regionShortNames[school.region] ?? school.region}
                        </span>
                      </div>
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
          schools={schools}
          selectedMonth={selectedMonth}
          onClose={() => setIsSettingsOpen(false)}
          onUpdate={updateLendingCount}
        />
      )}
    </main>
  );
}
