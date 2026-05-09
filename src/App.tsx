/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { BookOpenText, Award, Settings2, MapPin } from 'lucide-react';
import { INITIAL_SCHOOLS, REGIONS } from './constants';
import { School } from './types';

import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

const geoUrl = "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_provinces_topo_simple.json";

// Map colors based on intensity
const getRegionColor = (count: number) => {
  if (count > 350) return '#FF6B6B';
  if (count > 250) return '#FFD93D';
  if (count > 150) return '#4ECDC4';
  return '#AB83A1';
};

const mapRegionNameToId = (name: string) => {
  const mapping: Record<string, string> = {
    "서울특별시": "seoul",
    "부산광역시": "busan",
    "대구광역시": "daegu",
    "인천광역시": "incheon",
    "광주광역시": "gwangju",
    "대전광역시": "daejeon",
    "울산광역시": "ulsan",
    "세종특별자치시": "sejong",
    "경기도": "gyeonggi",
    "강원도": "gangwon",
    "강원특별자치도": "gangwon",
    "충청북도": "chungbuk",
    "충청남도": "chungnam",
    "전라북도": "jeonbuk",
    "전북특별자치도": "jeonbuk",
    "전라남도": "jeonnam",
    "경상북도": "gyeongbuk",
    "경상남도": "gyeongnam",
    "제주특별자치도": "jeju",
  };
  return mapping[name] || "";
};

const KoreaMap = ({ regionalCounts }: { regionalCounts: Record<string, number> }) => {
  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{
        scale: 4500,
        center: [127.5, 36.0] // South Korea center approx
      }}
      className="w-full h-full drop-shadow-md"
    >
      <Geographies geography={geoUrl}>
        {({ geographies }) =>
          geographies.map((geo) => {
            const regionName = geo.properties.name || geo.properties.name_eng;
            const regionId = mapRegionNameToId(geo.properties.name);
            const count = regionalCounts[regionId] || 0;
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={getRegionColor(count)}
                stroke="#fff"
                strokeWidth={1}
                style={{
                  default: { outline: "none", transition: "all 250ms" },
                  hover: { outline: "none", fill: "#FF9F1C", cursor: "pointer", transition: "all 250ms" },
                  pressed: { outline: "none" },
                }}
              />
            );
          })
        }
      </Geographies>
    </ComposableMap>
  );
};

export default function App() {
  const [schools, setSchools] = useState<School[]>(INITIAL_SCHOOLS);

  const updateLendingCount = (id: string, newCount: number) => {
    setSchools(prev => prev.map(s => s.id === id ? { ...s, lendingCount: newCount } : s));
  };

  const sortedSchools = [...schools].sort((a, b) => b.lendingCount - a.lendingCount);
  
  const regionalCounts = schools.reduce((acc, school) => {
    acc[school.region] = (acc[school.region] || 0) + school.lendingCount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-sky-50 p-6 md:p-10 font-sans">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white p-3 rounded-2xl shadow-sm text-sky-500">
            <BookOpenText size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-sky-900 tracking-tight">도서관 대여 대왕</h1>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map Section */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-lg shadow-sky-100">
          <h2 className="text-2xl font-bold text-sky-800 mb-6 flex items-center gap-2">
            <MapPin className="text-rose-400" /> 권역별 총 대여 현황
          </h2>
          <div className="h-96 flex items-center justify-center">
            <KoreaMap regionalCounts={regionalCounts} />
          </div>
        </div>

        {/* Ranking & Settings Section */}
        <div className="space-y-8">
           {/* Leaderboard */}
           <div className="bg-white rounded-3xl p-8 shadow-lg shadow-sky-200 border-2 border-sky-100">
            <h2 className="text-xl font-bold text-sky-800 mb-6 flex items-center gap-2">
                <Award className="text-amber-500" /> 현재 등수 (Top 3)
            </h2>
            <ol className="space-y-3">
                {sortedSchools.slice(0, 3).map((school, index) => (
                    <li key={school.id} className="flex items-center justify-between bg-sky-50 p-4 rounded-xl">
                        <span className="font-bold text-sky-600 text-lg">#{index + 1} {school.name}</span>
                        <span className="font-extrabold text-sky-900">{school.lendingCount}권</span>
                    </li>
                ))}
            </ol>
           </div>

           {/* Settings */}
           <div className="bg-white rounded-3xl p-8 shadow-lg shadow-sky-100">
            <h2 className="text-xl font-bold text-sky-800 mb-6 flex items-center gap-2">
                <Settings2 className="text-yellow-500" /> [설정] 데이터 수정하기
            </h2>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {schools.map(school => (
                <div key={school.id} className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-slate-700 truncate w-32">{school.name}</span>
                  <input
                    type="number"
                    value={school.lendingCount}
                    onChange={(e) => updateLendingCount(school.id, parseInt(e.target.value) || 0)}
                    className="w-20 p-2 border-2 border-sky-100 rounded-lg text-center font-bold text-sky-700"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
