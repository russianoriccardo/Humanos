// The Hydration Guide: short, sourced cards. No card may claim to detox, flush or cure anything.
// pushesMore: suggests drinking more; hidden while the user follows a doctor's fluid limit.
import { Dumbbell, Moon, Sun, Target, Utensils, Zap, type LucideIcon } from 'lucide-react'

export type SituationId = 'energy' | 'focus' | 'meal' | 'heat' | 'training' | 'winddown'

export type GuideCard = {
  id: string
  kind: 'drink' | 'myth'
  situation?: SituationId
  title: string
  when?: string
  // Myths: the short answer, shown as a pill.
  verdict?: string
  why: string
  how?: string
  caveat?: string
  // Myths: what it means for the user.
  means?: string
  sources: string[]
  pushesMore: boolean
  // Drink cards that can become a quick log button.
  drink?: { name: string; ml: number; counts: boolean }
}

export const SITUATIONS: { id: SituationId; name: string; icon: LucideIcon; intro: string }[] = [
  { id: 'energy', name: 'More energy', icon: Zap, intro: 'Small changes that make the afternoon easier.' },
  { id: 'focus', name: 'Focus', icon: Target, intro: 'Drinks that help you concentrate.' },
  { id: 'meal', name: 'After a heavy meal', icon: Utensils, intro: 'Gentle ways to feel more settled when you have eaten a lot.' },
  { id: 'heat', name: 'Hot days', icon: Sun, intro: 'Staying ahead of the heat.' },
  { id: 'training', name: 'After training', icon: Dumbbell, intro: 'What to drink, depending on the session.' },
  { id: 'winddown', name: 'Winding down', icon: Moon, intro: 'Drinks that work with your sleep.' },
]

const GREEN_TEA_HOW = 'Steep 2 to 3 minutes in water just off the boil.'

export const GUIDE: GuideCard[] = [
  {
    id: 'energy-water',
    kind: 'drink',
    situation: 'energy',
    title: 'A big glass of water first',
    when: 'When the afternoon slump hits',
    why: 'Even mild dehydration can feel like tiredness and low mood.',
    sources: ['Armstrong et al., J Nutr 2012', 'Ganio et al., Br J Nutr 2011'],
    pushesMore: true,
    drink: { name: 'Water', ml: 330, counts: true },
  },
  {
    id: 'energy-coffee',
    kind: 'drink',
    situation: 'energy',
    title: 'One coffee, before 14:00',
    when: 'For a real lift',
    why: "Caffeine lifts alertness. Keeping it early protects tonight's sleep.",
    caveat: 'Most adults are fine up to 400 mg of caffeine a day, 200 mg in pregnancy.',
    sources: ['EFSA caffeine opinion 2015'],
    pushesMore: false,
  },
  {
    id: 'energy-greentea',
    kind: 'drink',
    situation: 'energy',
    title: 'Green tea for a gentler lift',
    when: 'Mid morning',
    why: 'Less caffeine than coffee, plus L theanine for a calmer lift.',
    how: GREEN_TEA_HOW,
    sources: ['Einöther and Martens, Am J Clin Nutr 2013'],
    pushesMore: false,
    drink: { name: 'Green tea', ml: 250, counts: true },
  },
  {
    id: 'focus-greentea',
    kind: 'drink',
    situation: 'focus',
    title: 'Green tea for the afternoon',
    when: 'When you need to concentrate',
    why: 'Gentler than coffee. The L theanine in tea helps you stay focused without the jitters.',
    how: GREEN_TEA_HOW,
    sources: ['Owen et al., Nutritional Neuroscience 2008'],
    pushesMore: false,
    drink: { name: 'Green tea', ml: 250, counts: true },
  },
  {
    id: 'focus-bottle',
    kind: 'drink',
    situation: 'focus',
    title: 'A bottle on your desk',
    when: 'While you work',
    why: 'Steady sips keep concentration from dipping.',
    sources: ['Edmonds et al., Front Hum Neurosci 2013'],
    pushesMore: true,
  },
  {
    id: 'focus-sparkling',
    kind: 'drink',
    situation: 'focus',
    title: 'Sparkling water instead of an energy drink',
    when: 'In the afternoon',
    why: 'The refresh without a big dose of sugar.',
    how: 'Add a slice of lemon or a few mint leaves.',
    sources: ['WHO sugars guideline 2015'],
    pushesMore: false,
  },
  {
    id: 'meal-ginger',
    kind: 'drink',
    situation: 'meal',
    title: 'Ginger tea',
    when: 'When you feel full or a little queasy',
    why: 'Ginger has the best evidence of any kitchen remedy for nausea, and may help your stomach empty a little faster.',
    how: 'Slice 3 or 4 thin rounds of fresh ginger. Steep them in hot water for 5 to 10 minutes. Add a squeeze of lemon if you like.',
    caveat: 'Taking blood thinners? Check with your doctor before drinking it every day.',
    sources: ['Viljoen et al., Nutrition Journal 2014', 'Hu et al., World J Gastroenterology 2011'],
    pushesMore: false,
    drink: { name: 'Ginger tea', ml: 250, counts: true },
  },
  {
    id: 'meal-peppermint',
    kind: 'drink',
    situation: 'meal',
    title: 'Peppermint tea',
    when: 'If you feel bloated',
    why: 'Many people find it soothing after a big meal.',
    caveat: 'Skip it if you get heartburn, since peppermint can make reflux worse.',
    sources: ['NIH NCCIH, Peppermint oil'],
    pushesMore: false,
    drink: { name: 'Peppermint tea', ml: 250, counts: true },
  },
  {
    id: 'meal-water',
    kind: 'drink',
    situation: 'meal',
    title: 'Water, slowly',
    when: 'Instead of fizzy drinks',
    why: 'Sip a glass over a few minutes rather than gulping. Bubbles add gas when you already feel full.',
    sources: ['NHS, Bloating'],
    pushesMore: false,
  },
  {
    id: 'heat-water',
    kind: 'drink',
    situation: 'heat',
    title: 'Water little and often',
    when: "All day when it's hot",
    why: 'Steady sips beat a big catch up later.',
    sources: ['NHS, Heatwave: how to cope'],
    pushesMore: true,
  },
  {
    id: 'heat-milk',
    kind: 'drink',
    situation: 'heat',
    title: 'Milk after time in the sun',
    when: 'After being outside',
    why: 'It keeps you hydrated longer than water, thanks to its protein and salts.',
    caveat: 'Lactose free milk works the same.',
    sources: ['Maughan et al., Am J Clin Nutr 2016'],
    pushesMore: true,
    drink: { name: 'Milk', ml: 250, counts: true },
  },
  {
    id: 'heat-alcohol',
    kind: 'drink',
    situation: 'heat',
    title: 'Go easy on alcohol',
    when: 'Hot evenings',
    why: 'Alcohol makes you lose more fluid. Alternate each drink with a glass of water.',
    sources: ['NHS, Heatwave: how to cope'],
    pushesMore: false,
  },
  {
    id: 'training-water',
    kind: 'drink',
    situation: 'training',
    title: 'Water for under an hour',
    when: 'Most workouts',
    why: 'Shorter sessions need nothing more than water.',
    sources: ['ACSM position stand, Sawka et al. 2007'],
    pushesMore: true,
  },
  {
    id: 'training-sports',
    kind: 'drink',
    situation: 'training',
    title: 'Sports drink for long or sweaty sessions',
    when: 'Over about an hour',
    why: 'Salts and carbs help when you sweat a lot for a long time.',
    caveat: 'Not needed for short or easy sessions.',
    sources: ['ACSM position stand, Sawka et al. 2007'],
    pushesMore: true,
  },
  {
    id: 'training-milk',
    kind: 'drink',
    situation: 'training',
    title: 'Milk or chocolate milk',
    when: 'After strength work',
    why: 'Fluid, protein and salts in one glass.',
    sources: ['Shirreffs et al., Br J Nutr 2007'],
    pushesMore: true,
    drink: { name: 'Milk', ml: 250, counts: true },
  },
  {
    id: 'winddown-chamomile',
    kind: 'drink',
    situation: 'winddown',
    title: 'Chamomile tea',
    when: 'An hour before bed',
    why: 'Caffeine free, and it may help sleep quality. The evidence is modest.',
    caveat: "Avoid it if you're allergic to ragweed.",
    sources: ['Hieu et al., Phytotherapy Research 2019'],
    pushesMore: false,
    drink: { name: 'Chamomile', ml: 250, counts: true },
  },
  {
    id: 'winddown-coffee',
    kind: 'drink',
    situation: 'winddown',
    title: 'Last coffee by 14:00',
    when: 'Every day',
    why: 'Caffeine 6 hours before bed still cut sleep by about an hour in a sleep lab study.',
    sources: ['Drake et al., J Clin Sleep Med 2013'],
    pushesMore: false,
  },
  {
    id: 'winddown-sips',
    kind: 'drink',
    situation: 'winddown',
    title: 'Small sips after 20:00',
    when: 'In the evening',
    why: 'Drinking most of your water earlier means fewer trips to the bathroom at night.',
    sources: ['NHS, Peeing at night'],
    pushesMore: false,
  },
  {
    id: 'myth-coffee',
    kind: 'myth',
    title: 'Does coffee dehydrate you?',
    verdict: 'Not in normal amounts',
    why: 'When men drank 4 cups of coffee a day for 3 days, they stayed as hydrated as when they drank the same amount of water. At everyday doses, caffeine barely changes how much you pee.',
    means: 'Your coffees count toward your target, and they already do in Today. Keep the last one before 14:00 for your sleep.',
    sources: ['Killer, Blannin and Jeukendrup, PLoS ONE 2014'],
    pushesMore: false,
  },
  {
    id: 'myth-eight',
    kind: 'myth',
    title: 'Do you need 8 glasses a day?',
    verdict: 'There is no magic number',
    why: 'Needs change with your body, the weather and how active you are, and food gives about a fifth of your water.',
    means: 'Your target is built from your weight and activity, not a rule of thumb.',
    sources: ['Valtin, Am J Physiol 2002', 'EFSA water opinion 2010'],
    pushesMore: false,
  },
  {
    id: 'myth-onlywater',
    kind: 'myth',
    title: 'Only water counts?',
    verdict: 'Almost everything counts',
    why: 'Tea, milk, juice, soup and watery food all hydrate you. Milk even keeps you hydrated longer than water.',
    means: "Log what you drink. Only alcohol doesn't count.",
    sources: ['Maughan et al., Am J Clin Nutr 2016', 'EFSA 2010'],
    pushesMore: false,
  },
  {
    id: 'myth-thirst',
    kind: 'myth',
    title: "Thirsty means you're already dehydrated?",
    verdict: 'Not for most adults',
    why: 'Thirst is an early and reliable signal for healthy adults.',
    caveat: 'Older adults feel thirst less, so a routine helps.',
    sources: ['Valtin 2002', 'Kenney and Chiu, Med Sci Sports Exerc 2001'],
    pushesMore: false,
  },
  {
    id: 'myth-more',
    kind: 'myth',
    title: 'More water is always better?',
    verdict: 'No',
    why: 'Drinking a lot very fast can dilute the sodium in your blood. Spread it through the day.',
    sources: ['Hew-Butler et al., Clin J Sport Med 2015'],
    pushesMore: true,
  },
]

export const cardById = (id: string) => GUIDE.find((c) => c.id === id)

// Doctor mode hides every card that suggests drinking more.
export const visibleCards = (doctor: boolean) => GUIDE.filter((c) => !doctor || !c.pushesMore)

export const situationOf = (id: string) => SITUATIONS.find((s) => s.id === id)

export type ForYouContext = {
  now: Date
  doctor: boolean
  // A hot day adjustment is active today.
  hot: boolean
  // Workout minutes today; 0 without Apple Health.
  workoutMinutes: number
  // Rested score (1 to 5) from Sleep's latest morning check in, when Sleep is live.
  lastRested: number | null
  coffeesToday: number
  behind: boolean
  isDay1: boolean
  hasCoffee: boolean
  // Day number since day 1, to rotate the fallback card.
  dayNumber: number
}

export type ForYou = { card: GuideCard; action?: 'logWater' }

// The one Guide card for right now. First match wins; cards that push more are skipped in doctor mode.
export function forYouToday(ctx: ForYouContext): ForYou | null {
  const hour = ctx.now.getHours()
  const pick = (id: string, action?: ForYou['action']): ForYou | null => {
    const card = cardById(id)
    return card && !(ctx.doctor && card.pushesMore) ? { card, action } : null
  }
  const rules: (() => ForYou | null)[] = [
    () => (ctx.hot ? pick('heat-milk') : null),
    () => (ctx.workoutMinutes > 0 ? pick(ctx.workoutMinutes >= 60 ? 'training-sports' : 'training-water') : null),
    () => (ctx.lastRested !== null && ctx.lastRested <= 2 ? pick('energy-water') : null),
    () => (ctx.coffeesToday >= 3 ? pick('winddown-coffee') : null),
    () => (hour >= 19 ? pick('winddown-sips') : null),
    () => (ctx.behind && hour >= 14 && hour < 18 ? pick('energy-water', 'logWater') : null),
    () => (hour >= 13 && hour < 18 ? pick('focus-greentea') : null),
    () => (ctx.isDay1 && ctx.hasCoffee ? pick('myth-coffee') : null),
  ]
  for (const rule of rules) {
    const hit = rule()
    if (hit) return hit
  }
  const drinks = visibleCards(ctx.doctor).filter((c) => c.kind === 'drink')
  return drinks.length ? { card: drinks[Math.abs(ctx.dayNumber) % drinks.length] } : null
}
