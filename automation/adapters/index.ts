import type { BankAdapter } from './types.js'

type Factory=()=>BankAdapter
const registry=new Map<string,Factory>()

export function registerAdapter(key:string,factory:Factory){
  const normalized=key.trim().toLowerCase()
  if(!normalized) throw new Error('Adapter key is required')
  registry.set(normalized,factory)
}

export function getAdapter(key:string):BankAdapter{
  const factory=registry.get(key.trim().toLowerCase())
  if(!factory) throw new Error(`No authorized provider adapter registered for ${key}`)
  return factory()
}

export function listAdapters(){return [...registry.keys()].sort()}
