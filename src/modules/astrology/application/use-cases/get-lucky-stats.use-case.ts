import { Injectable } from '@nestjs/common';

@Injectable()
export class GetLuckyStatsUseCase {
  execute(sign: string, dateStr: string) {
    const signLower = sign.toLowerCase();
    
    // 1. Numerology of the Date
    // Example dateStr: "2026-06-26" -> 2+0+2+6+0+6+2+6 = 24 -> 6
    const dateNum = dateStr
      .replace(/[^0-9]/g, '')
      .split('')
      .map(Number)
      .reduce((a, b) => a + b, 0);
      
    let reducedDateNum = dateNum;
    while (reducedDateNum > 9) {
      reducedDateNum = reducedDateNum
        .toString()
        .split('')
        .map(Number)
        .reduce((a, b) => a + b, 0);
    }

    // 2. Zodiac Ruling Planets & Colors
    // Based on authentic Vedic astrology
    const zodiacData: Record<string, { planet: string, colors: {name: string, hex: string}[], number: number }> = {
      aries: { planet: 'Mars', colors: [{name: 'Red', hex: '#E63946'}, {name: 'Coral', hex: '#FF7F50'}], number: 9 },
      taurus: { planet: 'Venus', colors: [{name: 'White', hex: '#FFFFFF'}, {name: 'Pink', hex: '#F4ACB7'}], number: 6 },
      gemini: { planet: 'Mercury', colors: [{name: 'Green', hex: '#2A9D8F'}, {name: 'Light Green', hex: '#90EE90'}], number: 5 },
      cancer: { planet: 'Moon', colors: [{name: 'Silver', hex: '#C0C0C0'}, {name: 'Pearl', hex: '#EAE0C8'}], number: 2 },
      leo: { planet: 'Sun', colors: [{name: 'Orange', hex: '#F4A261'}, {name: 'Gold', hex: '#FFD700'}], number: 1 },
      virgo: { planet: 'Mercury', colors: [{name: 'Green', hex: '#2A9D8F'}, {name: 'Brown', hex: '#8B4513'}], number: 5 },
      libra: { planet: 'Venus', colors: [{name: 'White', hex: '#FFFFFF'}, {name: 'Light Blue', hex: '#ADD8E6'}], number: 6 },
      scorpio: { planet: 'Mars', colors: [{name: 'Red', hex: '#E63946'}, {name: 'Black', hex: '#000000'}], number: 9 },
      sagittarius: { planet: 'Jupiter', colors: [{name: 'Yellow', hex: '#E9C46A'}, {name: 'Mustard', hex: '#FFDB58'}], number: 3 },
      capricorn: { planet: 'Saturn', colors: [{name: 'Black', hex: '#000000'}, {name: 'Dark Blue', hex: '#00008B'}], number: 8 },
      aquarius: { planet: 'Saturn', colors: [{name: 'Blue', hex: '#1D3557'}, {name: 'Purple', hex: '#9C89B8'}], number: 8 },
      pisces: { planet: 'Jupiter', colors: [{name: 'Yellow', hex: '#E9C46A'}, {name: 'Sea Green', hex: '#2E8B57'}], number: 3 },
    };

    const data = zodiacData[signLower] || zodiacData['aries']; // fallback

    // Calculate final lucky number (combination of daily number + zodiac number)
    let finalNumber = reducedDateNum + data.number;
    while (finalNumber > 9) {
      finalNumber = finalNumber.toString().split('').map(Number).reduce((a, b) => a + b, 0);
    }

    // Select color from the zodiac's colors based on the day (even/odd)
    const colorIndex = reducedDateNum % data.colors.length;
    const finalColor = data.colors[colorIndex];

    // Calculate auspicious time (Choghadiya inspired simple rule based on planet hour)
    // Mapping day to specific time slots
    const timeSlots = [
      "08:00 AM - 10:00 AM", "09:00 AM - 11:00 AM", "10:00 AM - 12:00 PM",
      "11:00 AM - 01:00 PM", "12:00 PM - 02:00 PM", "01:00 PM - 03:00 PM",
      "02:00 PM - 04:00 PM", "03:00 PM - 05:00 PM", "04:00 PM - 06:00 PM",
      "05:00 PM - 07:00 PM", "06:00 PM - 08:00 PM", "07:00 PM - 09:00 PM",
    ];
    // Create a predictable time index
    const timeIndex = (reducedDateNum + data.number) % timeSlots.length;
    const finalTime = timeSlots[timeIndex];

    return {
      lucky_number: finalNumber,
      lucky_color: finalColor,
      lucky_time: finalTime
    };
  }
}
