
export interface QuranAyah {
  number: number;
  text: string;
  surah: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
  };
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface QuranSearchResult {
  count: number;
  results: QuranAyah[];
}

const BASE_URL = 'https://api.alquran.cloud/v1';

export const searchQuranByKeyword = async (keyword: string, surah: string = 'all', language: string = 'es.cortes'): Promise<QuranAyah[]> => {
  try {
    const response = await fetch(`${BASE_URL}/search/${encodeURIComponent(keyword)}/${surah}/${language}`);
    const data = await response.json();
    if (data.code === 200) {
      return data.data.matches;
    }
    return [];
  } catch (error) {
    console.error('Error searching Quran by keyword:', error);
    return [];
  }
};

export const getAyah = async (surah: number, ayah: number, language: string = 'es.cortes'): Promise<any | null> => {
  try {
    const response = await fetch(`${BASE_URL}/ayah/${surah}:${ayah}/editions/quran-uthmani,${language},ar.jalalayn`);
    const data = await response.json();
    if (data.code === 200) {
      // data.data is an array of editions
      return {
        ...data.data[0],
        arabicText: data.data[0].text,
        text: data.data[1].text,
        translation: data.data[1].text,
        explanation: data.data[2].text
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching Ayah:', error);
    return null;
  }
};

export const getAllSurahs = async (): Promise<Surah[]> => {
  try {
    const response = await fetch(`${BASE_URL}/surah`);
    const data = await response.json();
    if (data.code === 200) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching all surahs:', error);
    return [];
  }
};

export const getSurah = async (surahNumber: number, language: string = 'es.cortes'): Promise<any> => {
  try {
    const response = await fetch(`${BASE_URL}/surah/${surahNumber}/editions/quran-uthmani,${language}`);
    const data = await response.json();
    if (data.code === 200) {
      const arabicEdition = data.data[0];
      const translationEdition = data.data[1];
      
      const ayahs = arabicEdition.ayahs.map((ayah: any, index: number) => ({
        ...ayah,
        arabicText: ayah.text,
        translation: translationEdition.ayahs[index].text,
        text: translationEdition.ayahs[index].text
      }));

      return {
        ...arabicEdition,
        ayahs
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching Surah:', error);
    return null;
  }
};

export const getAyahOfTheDay = async (language: string = 'es.cortes'): Promise<any | null> => {
  try {
    // There are 6236 ayahs in the Quran
    const totalAyahs = 6236;
    const today = new Date();
    // Deterministic selection based on date
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const ayahNumber = (dayOfYear * 13) % totalAyahs + 1;

    // Fetch Arabic, Translation, and Jalalayn Tafsir
    const response = await fetch(`${BASE_URL}/ayah/${ayahNumber}/editions/quran-uthmani,${language},ar.jalalayn`);
    const data = await response.json();
    if (data.code === 200) {
      return {
        ...data.data[0],
        arabicText: data.data[0].text,
        translation: data.data[1].text,
        explanation: data.data[2].text,
        surah: data.data[0].surah,
        numberInSurah: data.data[0].numberInSurah
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching Ayah of the day:', error);
    return null;
  }
};
