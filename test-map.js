const rawResponse = {
  "status": "ok",
  "data": {
    "vaara": "Monday",
    "nakshatra": [
      {
        "name": "Mrigashirsha",
        "start": "2026-06-14T22:13:58+05:30",
        "end": "2026-06-15T19:08:27+05:30"
      }
    ],
    "tithi": [
      {
        "name": "Amavasya",
        "start": "2026-06-14T12:20:15+05:30",
        "end": "2026-06-15T08:24:10+05:30"
      }
    ],
    "karana": [
      {
        "name": "Naga",
        "start": "2026-06-14T22:22:31+05:30",
        "end": "2026-06-15T08:24:10+05:30"
      }
    ],
    "yoga": [
      {
        "name": "Soola",
        "start": "2026-06-14T13:15:01+05:30",
        "end": "2026-06-15T08:55:24+05:30"
      }
    ],
    "sunrise": "2026-06-15T05:27:14+05:30",
    "sunset": "2026-06-15T19:16:06+05:30",
    "moonrise": "2026-06-15T05:05:05+05:30",
    "moonset": "2026-06-15T19:58:17+05:30",
    "auspicious_period": [
      {
        "name": "Abhijit Muhurat",
        "period": [
          {
            "start": "2026-06-15T11:53:59+05:30",
            "end": "2026-06-15T12:49:14+05:30"
          }
        ]
      }
    ]
  }
};

class Tester {
  formatTime(isoString) {
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

  mapPanchangToFrontendSchema(rawResponse) {
    const data = (rawResponse?.data || rawResponse || {});
    const panchang = (data.panchang || rawResponse?.panchang || data || {});

    console.log("PANCHANG KEYS:", Object.keys(panchang));
    console.log("panchang.tithi:", panchang.tithi);

    const extractItem = (arr) => {
      if (!arr || !Array.isArray(arr) || !arr.length) return null;
      const item = arr[0];
      return {
        name: item.name || '',
        start: this.formatTime(item.start),
        end: this.formatTime(item.end),
      };
    };

    const getMuhurat = (periods, searchName) => {
      if (!periods || !Array.isArray(periods)) return null;
      const period = periods.find(
        (p) =>
          p.name && p.name.toLowerCase().includes(searchName.toLowerCase()),
      );
      if (
        period &&
        period.period &&
        Array.isArray(period.period) &&
        period.period.length > 0
      ) {
        return {
          start: this.formatTime(period.period[0].start),
          end: this.formatTime(period.period[0].end),
        };
      }
      return null;
    };

    const auspicious = (panchang.auspicious_period || []);
    const inauspicious = (panchang.inauspicious_period || []);

    return {
      tithi: extractItem(panchang.tithi) || {
        name: 'N/A',
        start: 'N/A',
        end: 'N/A',
      },
      nakshatra: extractItem(panchang.nakshatra) || {
        name: 'N/A',
        start: 'N/A',
        end: 'N/A',
      },
      karana: extractItem(panchang.karana) || {
        name: 'N/A',
        start: 'N/A',
        end: 'N/A',
      },
      yoga: extractItem(panchang.yoga) || {
        name: 'N/A',
        start: 'N/A',
        end: 'N/A',
      },

      shubh_muhurat: {
        abhijit: getMuhurat(auspicious, 'abhijit') || {
          start: 'N/A',
          end: 'N/A',
        },
        brahma: getMuhurat(auspicious, 'brahma') || {
          start: 'N/A',
          end: 'N/A',
        },
      },
      ashubh_muhurat: {
        rahu_kalam: getMuhurat(inauspicious, 'rahu') || {
          start: 'N/A',
          end: 'N/A',
        },
        yamaganda: getMuhurat(inauspicious, 'yamaganda') || {
          start: 'N/A',
          end: 'N/A',
        },
      },

      sunrise:
        this.formatTime(data.sunrise) ||
        this.formatTime(panchang.sunrise) ||
        'N/A',
      sunset:
        this.formatTime(data.sunset) ||
        this.formatTime(panchang.sunset) ||
        'N/A',
      moonrise:
        this.formatTime(data.moonrise) ||
        this.formatTime(panchang.moonrise) ||
        'N/A',
    };
  }
}

console.log(JSON.stringify(new Tester().mapPanchangToFrontendSchema(rawResponse), null, 2));
