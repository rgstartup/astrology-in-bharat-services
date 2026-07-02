import { Injectable } from '@nestjs/common';

@Injectable()
export class GetLiveDarshansUseCase {
  // eslint-disable-next-line @typescript-eslint/require-await
  async execute() {
    return [
      {
        id: 1,
        name: 'Kashi Vishwanath',
        location: 'Varanasi, Uttar Pradesh',
        image:
          'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=800&auto=format&fit=crop',
        status: 'Live Now',
        video_url: 'https://www.youtube.com/embed/UXB0unZtVbs',
        description:
          'Experience the divine energy of Kashi Vishwanath temple live from Varanasi.',
      },
      {
        id: 2,
        name: 'Mahakaleshwar Jyotirlinga',
        location: 'Ujjain, Madhya Pradesh',
        image:
          'https://images.unsplash.com/photo-1600080645604-03714bca0ef6?q=80&w=800&auto=format&fit=crop',
        status: 'Live Now',
        video_url: 'https://www.youtube.com/embed/BEPUQyrgbF0',
        description:
          'Watch the Bhasma Aarti and daily rituals of Lord Mahakal live from Ujjain.',
      },
      {
        id: 3,
        name: 'Somnath Temple',
        location: 'Prabhas Patan, Gujarat',
        image:
          'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?q=80&w=800&auto=format&fit=crop',
        status: 'Live Now',
        video_url: 'https://www.youtube.com/embed/fopdU7c3mu4',
        description:
          'View the majestic Somnath temple situated on the shores of the Arabian Sea.',
      },
      {
        id: 4,
        name: 'Siddhivinayak Temple',
        location: 'Mumbai, Maharashtra',
        image:
          'https://images.unsplash.com/photo-1599863266228-56ebbb2a47ea?q=80&w=800&auto=format&fit=crop',
        status: 'Live Now',
        video_url: 'https://www.youtube.com/embed/XFg_Gcs2-kc',
        description:
          'Live Darshan of Lord Ganesha from the famous Siddhivinayak Temple in Mumbai.',
      },
      {
        id: 5,
        name: 'Shirdi Sai Baba',
        location: 'Shirdi, Maharashtra',
        image:
          'https://images.unsplash.com/photo-1623943362142-b0cece9fb3c2?q=80&w=800&auto=format&fit=crop',
        status: 'Live Now',
        video_url: 'https://www.youtube.com/embed/WQNTX3Cgc9I',
        description:
          'Experience the divine presence of Sai Baba through live Darshan from Shirdi.',
      },
      {
        id: 6,
        name: 'Iskcon Temple',
        location: 'Vrindavan, Uttar Pradesh',
        image:
          'https://images.unsplash.com/photo-1605663711906-8dce2eac85ff?q=80&w=800&auto=format&fit=crop',
        status: 'Live Now',
        video_url: 'https://www.youtube.com/embed/TSs6sUyIjqo',
        description:
          'Live Darshan and Kirtan from the Krishna Balaram Mandir in Vrindavan.',
      },
      {
        id: 7,
        name: 'Golden Temple (Harmandir Sahib)',
        location: 'Amritsar, Punjab',
        image:
          'https://images.unsplash.com/photo-1577908955375-397a67d74db1?q=80&w=800&auto=format&fit=crop',
        status: 'Live Now',
        video_url: 'https://www.youtube.com/embed/_R-ZdlhVIcs',
        description:
          'Experience the divine live Gurbani from the holy Golden Temple in Amritsar.',
      },
      {
        id: 8,
        name: 'Prem Mandir',
        location: 'Vrindavan, Uttar Pradesh',
        image:
          'https://images.unsplash.com/photo-1628178652458-7fba0b77da37?q=80&w=800&auto=format&fit=crop',
        status: 'Live Now',
        video_url: 'https://www.youtube.com/embed/WynCMVud6Po',
        description:
          'Live Darshan from the beautiful Prem Mandir, dedicated to Radha Krishna and Sita Ram.',
      },
    ];
  }
}
