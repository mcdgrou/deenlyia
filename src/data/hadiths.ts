export interface Hadith {
  id: string;
  text: string;
  narrator: string;
  book: string;
  number: number;
  reference: string;
}

export interface HadithCollection {
  id: string;
  name: string;
  hadiths: Hadith[];
}

export const HADITH_COLLECTIONS: HadithCollection[] = [
  {
    id: 'bukhari',
    name: 'Sahih al-Bukhari',
    hadiths: [
      {
        id: 'b1',
        number: 1,
        text: 'Las acciones son según las intenciones, y cada persona tendrá lo que haya tenido la intención.',
        narrator: 'Umar bin al-Khattab',
        book: 'Revelación',
        reference: 'Sahih al-Bukhari 1'
      },
      {
        id: 'b2',
        number: 2,
        text: 'El Islam se basa en cinco pilares: el testimonio de que no hay más dios que Alá y que Mahoma es su mensajero, establecer la oración, pagar el Zakat, realizar la peregrinación a la Casa y ayunar en Ramadán.',
        narrator: 'Abdullah bin Umar',
        book: 'Fe',
        reference: 'Sahih al-Bukhari 8'
      },
      {
        id: 'b3',
        number: 3,
        text: 'Ninguno de vosotros cree verdaderamente hasta que ama para su hermano lo que ama para sí mismo.',
        narrator: 'Anas bin Malik',
        book: 'Fe',
        reference: 'Sahih al-Bukhari 13'
      }
    ]
  },
  {
    id: 'muslim',
    name: 'Sahih Muslim',
    hadiths: [
      {
        id: 'm1',
        number: 1,
        text: 'La pureza es la mitad de la fe.',
        narrator: 'Abu Malik al-Ashari',
        book: 'Purificación',
        reference: 'Sahih Muslim 223'
      },
      {
        id: 'm2',
        number: 2,
        text: 'Quienquiera que alivie a un creyente de una de las aflicciones de este mundo, Alá lo aliviará de una de las aflicciones del Día de la Resurrección.',
        narrator: 'Abu Hurairah',
        book: 'Virtudes',
        reference: 'Sahih Muslim 2699'
      }
    ]
  },
  {
    id: 'nawawi',
    name: '40 Hadices de An-Nawawi',
    hadiths: [
      {
        id: 'n1',
        number: 1,
        text: 'Sed en este mundo como si fuerais un extraño o un viajero de paso.',
        narrator: 'Ibn Umar',
        book: 'Ascetismo',
        reference: '40 Hadith Nawawi 40'
      },
      {
        id: 'n2',
        number: 2,
        text: 'Parte de la excelencia del Islam de una persona es dejar de lado lo que no le concierne.',
        narrator: 'Abu Hurairah',
        book: 'Etiqueta',
        reference: '40 Hadith Nawawi 12'
      }
    ]
  }
];
