import React, { useRef } from 'react';
import { CityStay } from '../types/trip';

interface TabContainerProps {
  activeTab: string;
  allDays: { stay: CityStay; dayNumber: number }[];
  onTabChange: (tabId: string) => void;
}

export default function TabContainer({ activeTab, allDays, onTabChange }: TabContainerProps) {
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    
    // Scroll to center the selected tab
    if (tabsContainerRef.current && tabId !== 'overview') {
      const container = tabsContainerRef.current;
      const activeTabElement = container.querySelector(`[data-tab-id="${tabId}"]`);
      
      if (activeTabElement) {
        const containerWidth = container.offsetWidth;
        const tabLeft = (activeTabElement as HTMLElement).offsetLeft;
        const tabWidth = (activeTabElement as HTMLElement).offsetWidth;
        const scrollPosition = tabLeft - (containerWidth / 2) + (tabWidth / 2);
        
        container.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  };

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-700">
      <div 
        ref={tabsContainerRef}
        className="flex overflow-x-auto scrollbar-hide"
      >
        <button
          onClick={() => handleTabChange('overview')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Full Trip
        </button>
        {allDays.map(({ stay, dayNumber }) => (
          <button
            key={`day-${dayNumber}`}
            data-tab-id={`day-${dayNumber}`}
            onClick={() => handleTabChange(`day-${dayNumber}`)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === `day-${dayNumber}`
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Day {dayNumber}
          </button>
        ))}
      </div>
    </div>
  );
} 