import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarCache } from '../../infrastructure/entities/calendar-cache.entity';
import { PanchangamService } from '../services/panchangam.service';

@Injectable()
export class GetDailyPanchangUseCase {
  private readonly logger = new Logger(GetDailyPanchangUseCase.name);

  constructor(
    @InjectRepository(CalendarCache)
    private readonly cacheRepository: Repository<CalendarCache>,
    private readonly panchangamService: PanchangamService,
  ) {}

  private formatTime(isoString: string | Date | undefined): string {
    if (!isoString) return 'N/A';
    const dateObj = typeof isoString === 'string' ? new Date(isoString) : isoString;
    if (isNaN(dateObj.getTime())) return 'N/A';

    // Convert UTC to IST (+5:30)
    const utcMs = dateObj.getTime();
    const istDate = new Date(utcMs + (5.5 * 60 * 60 * 1000));
    
    let hours = istDate.getUTCHours();
    const minutes = istDate.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours < 10 ? '0' + hours : hours.toString();
    const minsStr = minutes < 10 ? '0' + minutes : minutes.toString();
    return `${hoursStr}:${minsStr} ${ampm}`;
  }

  private mapPanchangToFrontendSchema(serviceData: any, dateStr: string) {
    const { panchangam, moonPhase } = serviceData;

    // We can keep the deterministic mockup for dailyHoroscope
    const hash = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = ['Red', 'Green', 'Yellow', 'White', 'Orange', 'Blue', 'Pink', 'Black', 'Purple', 'Brown', 'Cyan', 'Sea Green'];
    
    // We'll calculate a mock day length if the true one isn't available easily
    let dayLengthStr = '12h 0m 0s';
    if (panchangam.sunrise && panchangam.sunset) {
      const sunriseTime = new Date(panchangam.sunrise).getTime();
      const sunsetTime = new Date(panchangam.sunset).getTime();
      const diffMs = sunsetTime - sunriseTime;
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      const s = Math.floor((diffMs % 60000) / 1000);
      dayLengthStr = `${h}h ${m}m ${s}s`;
    }

    // Map Exact timings from Panchangam-js
    const safeTimeRange = (obj: { start?: Date | string, end?: Date | string, startTime?: Date | string, endTime?: Date | string } | undefined) => {
      if (!obj) return { start: 'N/A', end: 'N/A' };
      return { start: this.formatTime(obj.start || obj.startTime), end: this.formatTime(obj.end || obj.endTime) };
    };

    return {
      tithi: { 
        name: panchangam.tithis?.[0]?.name || 'N/A', 
        start: this.formatTime(panchangam.tithis?.[0]?.startTime), 
        end: this.formatTime(panchangam.tithis?.[0]?.endTime) 
      },
      nakshatra: { 
        name: panchangam.nakshatras?.[0]?.name || 'N/A', 
        start: this.formatTime(panchangam.nakshatras?.[0]?.startTime), 
        end: this.formatTime(panchangam.nakshatras?.[0]?.endTime) 
      },
      karana: { 
        name: panchangam.karanas?.[0]?.name || 'N/A', 
        start: this.formatTime(panchangam.karanas?.[0]?.startTime),
        end: this.formatTime(panchangam.karanas?.[0]?.endTime) 
      },
      yoga: { 
        name: panchangam.yogas?.[0]?.name || 'N/A', 
        start: this.formatTime(panchangam.yogas?.[0]?.startTime), 
        end: this.formatTime(panchangam.yogas?.[0]?.endTime) 
      },
      shubhMuhurat: {
        abhijit: safeTimeRange(panchangam.abhijitMuhurta),
        brahma: safeTimeRange(panchangam.brahmaMuhurta),
        marriage: safeTimeRange(panchangam.durMuhurta?.[0]), // Mocking marriage/griha with durMuhurta/govardhan for structure
        grihaPravesh: safeTimeRange(panchangam.govardhanMuhurta),
        vehiclePurchase: safeTimeRange(panchangam.amritKalam?.[0]),
      },
      ashubhMuhurat: {
        rahuKalam: safeTimeRange(panchangam.rahuKalamStart ? { start: panchangam.rahuKalamStart, end: panchangam.rahuKalamEnd } : undefined),
        yamaganda: safeTimeRange(panchangam.yamagandaKalam),
      },
      sunrise: this.formatTime(panchangam.sunrise) || '05:28 AM',
      sunset: this.formatTime(panchangam.sunset) || '07:12 PM',
      moonrise: this.formatTime(panchangam.moonrise) || '09:15 AM',
      moonset: this.formatTime(panchangam.moonset) || '11:48 PM',
      dayLength: dayLengthStr,
      moonPhase: moonPhase,
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
    const type = 'daily-local';
    const cacheKey = `${date}-${lat}-${lon}-${lang}-v3`;

    const cached = await this.cacheRepository.findOne({
      where: { type, cacheKey },
    });
    if (cached) {
      this.logger.log(`Serving cached daily panchang for ${cacheKey}`);
      return cached.response;
    }

    this.logger.log(`Calculating fresh daily panchang for ${cacheKey} locally`);
    
    // Defaulting to Delhi coords if unparseable
    const latitude = parseFloat(lat) || 28.6139;
    const longitude = parseFloat(lon) || 77.2090;

    const rawResponse = this.panchangamService.getDailyPanchang(date, latitude, longitude);
    const response = this.mapPanchangToFrontendSchema(rawResponse, date);

    const newCache = this.cacheRepository.create({
      type,
      cacheKey,
      response,
    });
    await this.cacheRepository.save(newCache);

    return response;
  }
}
