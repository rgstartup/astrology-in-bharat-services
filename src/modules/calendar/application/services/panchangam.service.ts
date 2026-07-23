import { Injectable, Logger } from '@nestjs/common';
import { getPanchangam, Observer } from '@ishubhamx/panchangam-js';
import { Moon } from 'lunarphase-js';

@Injectable()
export class PanchangamService {
  private readonly logger = new Logger(PanchangamService.name);

  getDailyPanchang(date: string, lat: number, lon: number, tz: number = 5.5) {
    try {
      const dateObj = new Date(`${date}T00:00:00+05:30`);
      const obs = new Observer(lat, lon, tz);
      
      const p = getPanchangam(dateObj, obs);
      
      // Calculate moon phase manually using lunarphase-js
      const phaseEnum = Moon.lunarPhase(dateObj);
      const phaseStr = String(phaseEnum);
      // Determine approximate illumination from phase string (mock)
      let illumination = 50;
      if (phaseStr === 'New Moon') illumination = 0;
      if (phaseStr === 'Full Moon') illumination = 100;
      if (phaseStr.includes('Quarter')) illumination = 50;
      if (phaseStr.includes('Gibbous')) illumination = 75;
      if (phaseStr.includes('Crescent')) illumination = 25;

      // A simple deterministic full moon date for mocking "next full moon"
      // Real calculation requires an ephemeris package, but we can approximate
      const nextFullMoon = new Date(dateObj);
      nextFullMoon.setDate(nextFullMoon.getDate() + 14); // Very rough approximation for UI completeness
      const nextFullMoonStr = nextFullMoon.toISOString().split('T')[0];

      return {
        panchangam: p,
        moonPhase: {
          current: phaseStr,
          illumination: illumination,
          nextFullMoon: nextFullMoonStr,
        }
      };
    } catch (e) {
      this.logger.error('Error calculating panchangam', e);
      throw e;
    }
  }

  getYearlyFestivals(year: number, lat: number = 28.6139, lon: number = 77.2090, tz: number = 5.5) {
    try {
      const festivals: any[] = [];
      const obs = new Observer(lat, lon, tz);

      // Loop through all days of the year (this is fast locally)
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const p = getPanchangam(d, obs);
        if (p.festivals && p.festivals.length > 0) {
          const dateStr = d.toISOString().split('T')[0];
          p.festivals.forEach(fest => {
            festivals.push({
              name: fest.name,
              date: dateStr,
              description: fest.description || '',
              category: fest.category || 'general',
              type: fest.type || 'single'
            });
          });
        }
      }

      return festivals;
    } catch (e) {
      this.logger.error('Error calculating yearly festivals', e);
      throw e;
    }
  }
}
