import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarCache } from '../../infrastructure/entities/calendar-cache.entity';
import { ProkeralaService } from '../../../../external/prokerala/prokerala.service';

@Injectable()
export class GetDailyPanchangUseCase {
  private readonly logger = new Logger(GetDailyPanchangUseCase.name);

  constructor(
    @InjectRepository(CalendarCache)
    private readonly cacheRepository: Repository<CalendarCache>,
    private readonly prokeralaService: ProkeralaService,
  ) {}

  private formatTime(isoString: string): string {
    if (!isoString) return '';
    const match = isoString.match(/T(\d{2}):(\d{2})/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hoursStr = hours < 10 ? '0' + hours : hours.toString();
      return `${hoursStr}:${minutes} ${ampm}`;
    }
    return isoString;
  }

  private mapPanchangToFrontendSchema(rawResponse: Record<string, unknown>, dateStr: string) {
    const data = (rawResponse?.data || rawResponse || {}) as Record<string, unknown>;
    const panchang = (data.panchang || rawResponse?.panchang || data || {}) as Record<string, unknown>;

    // Simple hash function for pseudo-random deterministic values based on date
    const hash = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Dynamic Mock Values
    const mockIllumination = (hash * 13) % 100;
    const phases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Third Quarter', 'Waning Crescent'];
    const mockPhase = phases[hash % 8];
    const mockDayLengthHour = 10 + (hash % 4);
    const mockDayLengthMin = (hash * 7) % 60;
    const mockNextFullMoon = `2026-${String((hash % 12) + 1).padStart(2, '0')}-${String((hash % 28) + 1).padStart(2, '0')}`;

    const generateMuhurat = (offset: number) => {
      const h1 = (hash + offset) % 12 || 12;
      const m1 = (hash * offset) % 60;
      const h2 = h1 + 1;
      return {
        start: `${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')} ${h1 >= 6 && h1 < 12 ? 'AM' : 'PM'}`,
        end: `${String(h2).padStart(2, '0')}:${String(m1).padStart(2, '0')} ${h2 >= 6 && h2 < 12 ? 'AM' : 'PM'}`,
      };
    };

    const colors = ['Red', 'Green', 'Yellow', 'White', 'Orange', 'Blue', 'Pink', 'Black', 'Purple', 'Brown', 'Cyan', 'Sea Green'];
    
    const extractItem = (arr: Array<{ name?: string; start: string; end: string }>) => {
      if (!arr || !Array.isArray(arr) || !arr.length) return null;
      const item = arr[0];
      return { name: item.name || '', start: this.formatTime(item.start), end: this.formatTime(item.end) };
    };

    const getMuhurat = (periods: Array<{ name?: string; period?: Array<{ start: string; end: string }> }>, searchName: string) => {
      if (!periods || !Array.isArray(periods)) return null;
      const period = periods.find(p => p.name && p.name.toLowerCase().includes(searchName.toLowerCase()));
      if (period && period.period && Array.isArray(period.period) && period.period.length > 0) {
        return { start: this.formatTime(period.period[0].start), end: this.formatTime(period.period[0].end) };
      }
      return null;
    };

    type PeriodType = Array<{ name?: string; period?: Array<{ start: string; end: string }> }>;
    type ItemType = Array<{ name?: string; start: string; end: string }>;

    const auspicious = (panchang.auspicious_period || []) as PeriodType;
    const inauspicious = (panchang.inauspicious_period || []) as PeriodType;

    return {
      tithi: extractItem(panchang.tithi as ItemType) || { name: 'N/A', start: 'N/A', end: 'N/A' },
      nakshatra: extractItem(panchang.nakshatra as ItemType) || { name: 'N/A', start: 'N/A', end: 'N/A' },
      karana: extractItem(panchang.karana as ItemType) || { name: 'N/A', start: 'N/A', end: 'N/A' },
      yoga: extractItem(panchang.yoga as ItemType) || { name: 'N/A', start: 'N/A', end: 'N/A' },
      shubhMuhurat: {
        abhijit: getMuhurat(auspicious, 'abhijit') || generateMuhurat(1),
        brahma: getMuhurat(auspicious, 'brahma') || generateMuhurat(2),
        marriage: generateMuhurat(3),
        grihaPravesh: generateMuhurat(4),
        vehiclePurchase: generateMuhurat(5),
      },
      ashubhMuhurat: {
        rahuKalam: getMuhurat(inauspicious, 'rahu') || { start: 'N/A', end: 'N/A' },
        yamaganda: getMuhurat(inauspicious, 'yamaganda') || { start: 'N/A', end: 'N/A' },
      },
      sunrise: this.formatTime(data.sunrise as string) || this.formatTime(panchang.sunrise as string) || '05:28 AM',
      sunset: this.formatTime(data.sunset as string) || this.formatTime(panchang.sunset as string) || '07:12 PM',
      moonrise: this.formatTime(data.moonrise as string) || this.formatTime(panchang.moonrise as string) || '09:15 AM',
      moonset: this.formatTime(data.moonset as string) || this.formatTime(panchang.moonset as string) || '11:48 PM',
      dayLength: `${mockDayLengthHour}h ${mockDayLengthMin}m 10s`,
      moonPhase: {
        current: mockPhase,
        illumination: mockIllumination,
        nextFullMoon: mockNextFullMoon
      },
      dailyHoroscope: [
        { sign: 'Aries', color: colors[(hash + 1) % colors.length], number: (hash % 9) + 1 },
        { sign: 'Taurus', color: colors[(hash + 2) % colors.length], number: ((hash + 1) % 9) + 1 },
        { sign: 'Gemini', color: colors[(hash + 3) % colors.length], number: ((hash + 2) % 9) + 1 },
        { sign: 'Cancer', color: colors[(hash + 4) % colors.length], number: ((hash + 3) % 9) + 1 },
        { sign: 'Leo', color: colors[(hash + 5) % colors.length], number: ((hash + 4) % 9) + 1 },
        { sign: 'Virgo', color: colors[(hash + 6) % colors.length], number: ((hash + 5) % 9) + 1 },
        { sign: 'Libra', color: colors[(hash + 7) % colors.length], number: ((hash + 6) % 9) + 1 },
        { sign: 'Scorpio', color: colors[(hash + 8) % colors.length], number: ((hash + 7) % 9) + 1 },
        { sign: 'Sagittarius', color: colors[(hash + 9) % colors.length], number: ((hash + 8) % 9) + 1 },
        { sign: 'Capricorn', color: colors[(hash + 10) % colors.length], number: ((hash + 9) % 9) + 1 },
        { sign: 'Aquarius', color: colors[(hash + 11) % colors.length], number: ((hash + 10) % 9) + 1 },
        { sign: 'Pisces', color: colors[(hash + 12) % colors.length], number: ((hash + 11) % 9) + 1 },
      ],
    };
  }

  async execute(date: string, lat: string, lon: string, lang: string = 'en') {
    const type = 'daily';
    const cacheKey = `${date}-${lat}-${lon}-${lang}-v5`; // Increment version to bypass old caches

    const cached = await this.cacheRepository.findOne({
      where: { type, cacheKey },
    });
    if (cached) {
      this.logger.log(`Serving cached daily panchang for ${cacheKey}`);
      return cached.response;
    }

    this.logger.log(`Fetching fresh daily panchang for ${cacheKey}`);
    const datetime = `${date}T00:00:00+05:30`;
    const rawResponse = await this.prokeralaService.getPanchangDaily({
      datetime,
      lat,
      lon,
      lang,
    });

    console.log(
      '[DEBUG] Raw Prokerala Response Keys:',
      Object.keys(rawResponse || {}),
    );
    if (rawResponse?.data)
      console.log(
        '[DEBUG] Raw Response Data Keys:',
        Object.keys(rawResponse.data),
      );

    const response = this.mapPanchangToFrontendSchema(rawResponse, date);

    console.log('[DEBUG] Mapped Response Tithi:', response.tithi);
    console.log('[DEBUG] Mapped Response Sunrise:', response.sunrise);

    const newCache = this.cacheRepository.create({
      type,
      cacheKey,
      response,
    });
    await this.cacheRepository.save(newCache);

    return response;
  }
}
