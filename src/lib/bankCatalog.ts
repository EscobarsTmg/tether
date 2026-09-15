export type BankCatalogItem = {
  code: string
  name: string
  shortName: string
  category: 'bank' | 'participation' | 'digital'
  country: 'TR'
}

// Institution catalog used by the operations UI. A catalog entry does not imply
// that an API connection is active. Live access must be configured through an
// authorized Open Banking / OAuth provider on the server side.
export const bankCatalog: BankCatalogItem[] = [
  { code: 'AKBANK', name: 'Akbank T.A.Ş.', shortName: 'Akbank', category: 'bank', country: 'TR' },
  { code: 'ALBARAKA', name: 'Albaraka Türk Katılım Bankası A.Ş.', shortName: 'Albaraka Türk', category: 'participation', country: 'TR' },
  { code: 'ALTERNATIF', name: 'Alternatifbank A.Ş.', shortName: 'Alternatif Bank', category: 'bank', country: 'TR' },
  { code: 'ANADOLUBANK', name: 'Anadolubank A.Ş.', shortName: 'Anadolubank', category: 'bank', country: 'TR' },
  { code: 'AKTIF', name: 'Aktif Yatırım Bankası A.Ş.', shortName: 'Aktif Bank', category: 'bank', country: 'TR' },
  { code: 'BURGAN', name: 'Burgan Bank A.Ş.', shortName: 'Burgan Bank', category: 'bank', country: 'TR' },
  { code: 'DENIZBANK', name: 'DenizBank A.Ş.', shortName: 'DenizBank', category: 'bank', country: 'TR' },
  { code: 'FIBABANKA', name: 'Fibabanka A.Ş.', shortName: 'Fibabanka', category: 'bank', country: 'TR' },
  { code: 'GARANTI', name: 'Türkiye Garanti Bankası A.Ş.', shortName: 'Garanti BBVA', category: 'bank', country: 'TR' },
  { code: 'HALKBANK', name: 'Türkiye Halk Bankası A.Ş.', shortName: 'Halkbank', category: 'bank', country: 'TR' },
  { code: 'HSBC', name: 'HSBC Bank A.Ş.', shortName: 'HSBC Türkiye', category: 'bank', country: 'TR' },
  { code: 'ING', name: 'ING Bank A.Ş.', shortName: 'ING Türkiye', category: 'bank', country: 'TR' },
  { code: 'ISBANK', name: 'Türkiye İş Bankası A.Ş.', shortName: 'İş Bankası', category: 'bank', country: 'TR' },
  { code: 'KUVEYTTURK', name: 'Kuveyt Türk Katılım Bankası A.Ş.', shortName: 'Kuveyt Türk', category: 'participation', country: 'TR' },
  { code: 'ODEABANK', name: 'Odea Bank A.Ş.', shortName: 'Odeabank', category: 'bank', country: 'TR' },
  { code: 'QNB', name: 'QNB Bank A.Ş.', shortName: 'QNB Türkiye', category: 'bank', country: 'TR' },
  { code: 'SEKERBANK', name: 'Şekerbank T.A.Ş.', shortName: 'Şekerbank', category: 'bank', country: 'TR' },
  { code: 'TEB', name: 'Türk Ekonomi Bankası A.Ş.', shortName: 'TEB', category: 'bank', country: 'TR' },
  { code: 'TURKIYEFINANS', name: 'Türkiye Finans Katılım Bankası A.Ş.', shortName: 'Türkiye Finans', category: 'participation', country: 'TR' },
  { code: 'VAKIFBANK', name: 'Türkiye Vakıflar Bankası T.A.O.', shortName: 'VakıfBank', category: 'bank', country: 'TR' },
  { code: 'VAKIFKATILIM', name: 'Vakıf Katılım Bankası A.Ş.', shortName: 'Vakıf Katılım', category: 'participation', country: 'TR' },
  { code: 'YAPIKREDI', name: 'Yapı ve Kredi Bankası A.Ş.', shortName: 'Yapı Kredi', category: 'bank', country: 'TR' },
  { code: 'ZIRAAT', name: 'T.C. Ziraat Bankası A.Ş.', shortName: 'Ziraat Bankası', category: 'bank', country: 'TR' },
  { code: 'ZIRAATKATILIM', name: 'Ziraat Katılım Bankası A.Ş.', shortName: 'Ziraat Katılım', category: 'participation', country: 'TR' },
  { code: 'ENPARA', name: 'Enpara Bank A.Ş.', shortName: 'Enpara', category: 'digital', country: 'TR' },
  { code: 'TOM', name: 'T.O.M. Katılım Bankası A.Ş.', shortName: 'TOM Bank', category: 'digital', country: 'TR' },
]

export function bankByProvider(provider: string) {
  const code = provider.replace(/^tr:/i, '').toUpperCase()
  return bankCatalog.find((bank) => bank.code === code)
}
