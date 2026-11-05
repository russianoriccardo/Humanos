// Which sheet the Hydration module has open. Sheets render in the module's overlay so they cover the screen.
export type HydrationSheet =
  | { kind: 'log'; drinkId?: string }
  | { kind: 'edit'; id: string }
  | { kind: 'why' }
  | { kind: 'city' }
  | { kind: 'menu' }
  | { kind: 'reminders' }
  | { kind: 'reset' }
  | null
