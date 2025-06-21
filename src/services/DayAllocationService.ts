import { City, CityStay } from '../types/trip';

export class DayAllocationService {
  allocateDays(cities: City[], totalDays: number): CityStay[] {
    console.log(`📅 Allocating ${totalDays} days across ${cities.length} cities...`);
    
    if (cities.length === 0) {
      throw new Error('No cities to allocate days to');
    }
    
    const allocation: number[] = new Array(cities.length).fill(0);
    
    // Start city gets 0 days (departure only)
    allocation[0] = 0;
    let remainingDays = totalDays;
    
    // Calculate base days for each city (except start)
    for (let i = 1; i < cities.length; i++) {
      const baseDays = this.getBaseDaysForCity(cities[i], i === cities.length - 1);
      allocation[i] = Math.min(baseDays, remainingDays);
      remainingDays -= allocation[i];
    }
    
    // Distribute remaining days
    if (remainingDays > 0) {
      this.distributeRemainingDays(cities, allocation, remainingDays);
    }
    
    // Convert to CityStay objects
    const cityStays: CityStay[] = [];
    let currentDay = 1;
    
    for (let i = 0; i < cities.length; i++) {
      cityStays.push({
        city: cities[i],
        days: allocation[i],
        startDay: allocation[i] > 0 ? currentDay : 0,
        endDay: allocation[i] > 0 ? currentDay + allocation[i] - 1 : 0
      });
      
      if (allocation[i] > 0) {
        currentDay += allocation[i];
      }
    }
    
    console.log('✅ Day allocation complete:', allocation);
    return cityStays;
  }

  private getBaseDaysForCity(city: City, isDestination: boolean): number {
    // Destination gets a bonus
    if (isDestination) {
      if (city.importance >= 250) return 5;
      if (city.importance >= 200) return 4;
      if (city.importance >= 150) return 3;
      return 2;
    }
    
    // Intermediate cities based on importance
    if (city.importance >= 280) return 5; // Mega tourist destinations (Paris, Rome, etc.)
    if (city.importance >= 250) return 4; // Mega cities
    if (city.importance >= 200) return 3; // Major cities
    if (city.importance >= 150) return 2; // Regional capitals
    return 1; // Smaller cities
  }

  private distributeRemainingDays(
    cities: City[],
    allocation: number[],
    remainingDays: number
  ): void {
    const maxDaysPerCity = 7; // Allow up to a week in major destinations
    
    while (remainingDays > 0) {
      let distributed = false;
      
      // First pass: prioritize high-importance cities
      for (let i = 1; i < cities.length && remainingDays > 0; i++) {
        if (cities[i].importance >= 150 && allocation[i] < maxDaysPerCity) {
          allocation[i]++;
          remainingDays--;
          distributed = true;
        }
      }
      
      // Second pass: any city that hasn't reached max
      if (!distributed) {
        for (let i = 1; i < cities.length && remainingDays > 0; i++) {
          if (allocation[i] < maxDaysPerCity) {
            allocation[i]++;
            remainingDays--;
            distributed = true;
          }
        }
      }
      
      // If still can't distribute, give to destination
      if (!distributed && remainingDays > 0) {
        allocation[cities.length - 1] += remainingDays;
        remainingDays = 0;
      }
    }
  }
} 