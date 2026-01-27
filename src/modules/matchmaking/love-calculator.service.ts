import { Injectable } from '@nestjs/common';

@Injectable()
export class LoveCalculatorService {
  calculateLove(
    yourName: string,
    partnerName: string,
    yourGender?: string,
    partnerGender?: string,
  ) {
    const name1 = yourName.trim().toLowerCase();
    const name2 = partnerName.trim().toLowerCase();

    // Sort names to ensure consistency (A+B == B+A)
    const combined = [name1, name2].sort().join('');

    // Deterministic Hash
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) - hash + combined.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    // Map hash to 60 - 95 range
    const score = 60 + (Math.abs(hash) % 36);

    // Deterministic Message based on score
    let message = '';
    if (score >= 90) {
      message = 'Soulmates! Aap dono ek doosre ke liye hi bane hain.';
    } else if (score >= 80) {
      message = 'Great Chemistry! Aapki jodi kaafi solid hai.';
    } else if (score >= 70) {
      message = 'Good Match! Thodi koshish se ye rishta amar ho sakta hai.';
    } else {
      message =
        'Nice Connection! Intezaar kijiye, pyaar dheere dheere badhega.';
    }

    return {
      yourName,
      partnerName,
      yourGender,
      partnerGender,
      score,
      percentage: `${score}%`,
      message,
      timestamp: new Date().toISOString(),
    };
  }
}
