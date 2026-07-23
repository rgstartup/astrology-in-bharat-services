import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarCache } from '../../infrastructure/entities/calendar-cache.entity';

@Injectable()
export class GetFestivalDetailsUseCase {
  private readonly logger = new Logger(GetFestivalDetailsUseCase.name);

  constructor(
    @InjectRepository(CalendarCache)
    private readonly cacheRepository: Repository<CalendarCache>,
  ) {}

  async execute(name: string, lang: string = 'hi') {
    const type = 'festival-details';
    const cacheKey = `${name}-${lang}-v3`;

    const cached = await this.cacheRepository.findOne({
      where: { type, cacheKey },
    });
    
    if (cached) {
      this.logger.log(`Serving cached festival details for ${cacheKey}`);
      return cached.response;
    }

    this.logger.log(`Fetching fresh festival details from Wikipedia for ${cacheKey}`);
    
    try {
      const wikiLang = lang === 'hi' ? 'hi' : 'en';
      const searchTerm = name.split('(')[0].trim().replace(/\s+/g, '_');
      
      const res = await fetch(`https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${searchTerm}`);
      let responseData: any = { success: false, data: null };

      if (res.ok) {
        const data = await res.json();
        if (data.type !== 'disambiguation' && data.extract) {
          
          // Fetch FULL text to satisfy user request for more content
          try {
            const fullRes = await fetch(`https://${wikiLang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=false&explaintext=true&titles=${searchTerm}&redirects=1&format=json`);
            if (fullRes.ok) {
              const fullData = await fullRes.json();
              const pages = fullData.query?.pages;
              if (pages) {
                const pageId = Object.keys(pages)[0];
                if (pageId !== '-1' && pages[pageId].extract) {
                  // Replace the short summary with the massive full text
                  data.extract = pages[pageId].extract;
                }
              }
            }
          } catch (fullError) {
            this.logger.warn(`Failed to fetch full extract for ${name}, falling back to summary.`);
          }

          responseData = { success: true, data };
        }
      }

      // Cache the result (even if not found, to avoid spamming wiki)
      try {
        await this.cacheRepository.upsert(
          {
            type,
            cacheKey,
            response: responseData,
          },
          ['type', 'cacheKey']
        );
      } catch (dbError: any) {
        // Ignore duplicate key errors if two requests hit at exact same time
        if (dbError.code !== '23505') {
          this.logger.warn(`Failed to cache Wikipedia details: ${dbError.message}`);
        }
      }

      return responseData;
    } catch (error) {
      this.logger.error(`Failed to fetch Wikipedia details for ${name}`, error);
      return { success: false, data: null };
    }
  }
}
