const letters: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
}

export function productAddress(value: string): string {
  return [...value.toLowerCase()].map(c => letters[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120).replace(/-+$/g, '')
}

export function productArticle(value: string): string {
  if (/^[a-z0-9][a-z0-9._-]+$/i.test(value.trim())) return value.trim().toUpperCase()
  return productAddress(value).toUpperCase().slice(0, 80)
}
