export const union = <T>(set1: Set<T>, set2: Set<T>): Set<T> => {
  let set = new Set<T>()
  set1.forEach(x => set.add(x))
  set2.forEach(x => set.add(x))
  return set
}

export const intersect = <T>(set1: Set<T>, set2: Set<T>): Set<T> => {
  let set = new Set<T>()
  set1.forEach(x => {
    if (set2.has(x)) set.add(x)
  })
  return set
}

export const difference = <T>(set1: Set<T>, set2: Set<T>): Set<T> => {
  let set = new Set<T>()
  set1.forEach(x => {
    if (!set2.has(x)) set.add(x)
  })
  return set
}

export const toArray = <T>(set: Set<T>): T[] => Array.from(set.values())
