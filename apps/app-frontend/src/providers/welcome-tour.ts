import type { InjectionKey } from 'vue'

export const welcomeTourKey: InjectionKey<() => void> = Symbol('welcomeTour')
