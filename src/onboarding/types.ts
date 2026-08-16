export type Sex = 'female' | 'male' | 'other' | 'prefer-not-to-say'

export type Activity = 'low' | 'moderate' | 'high'

export type Goal = {
  id: string
  title: string
  description: string
  moduleId: string
}

export type Module = {
  id: string
  name: string
}

export type Answers = {
  name: string
  age: string
  sex: string
  height: string
  weight: string
  activity: Activity | null
  goals: string[]
  modules: string[]
}

export const initialAnswers: Answers = {
  name: '',
  age: '',
  sex: '',
  height: '',
  weight: '',
  activity: null,
  goals: [],
  modules: [],
}
