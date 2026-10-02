import { doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

export const MILESTONE_DEFS = [
  {
    days: 3,
    id: 'streak_3',
    badge: '🌱',
    title: '3-Day Starter',
    description: 'Off to a fantastic start! Building momentum one day at a time.',
    motivation: 'Consistency is key to every transformation. Keep it up!',
  },
  {
    days: 7,
    id: 'streak_7',
    badge: '🔥',
    title: '7-Day Consistency Champion',
    description: '7 full days of dedication! You survived the first week strong.',
    motivation: 'You have turned daily workout into a powerful habit!',
  },
  {
    days: 14,
    id: 'streak_14',
    badge: '⚡',
    title: '14-Day Fitness Warrior',
    description: 'Two full weeks of non-stop effort and progress!',
    motivation: 'Your strength and endurance are soaring day by day!',
  },
  {
    days: 30,
    id: 'streak_30',
    badge: '🏆',
    title: '30-Day Fitness Master',
    description: 'A complete 30-day streak! Incredible mastery and discipline.',
    motivation: 'You are living proof that daily effort yields real transformation!',
  },
  {
    days: 60,
    id: 'streak_60',
    badge: '👑',
    title: '60-Day Legend',
    description: '60 days of unbroken fitness dedication! Absolutely legendary.',
    motivation: 'Fitness is now an inseparable part of your life champion lifestyle!',
  },
  {
    days: 100,
    id: 'streak_100',
    badge: '💎',
    title: '100-Day Titan',
    description: '100 Days! The pinnacle of dedication and mental toughness.',
    motivation: 'You stand among the top 1% of dedicated athletes. True Titan!',
  },
]

export function checkUnclaimedMilestones(currentStreak, achievedMilestones = []) {
  if (!currentStreak || currentStreak <= 0) return []
  const achievedSet = new Set(achievedMilestones || [])
  return MILESTONE_DEFS.filter(m => currentStreak >= m.days && !achievedSet.has(m.id))
}

export async function claimMilestone(userId, milestoneId, currentAchieved = []) {
  if (!userId || !milestoneId) return
  const updated = Array.from(new Set([...currentAchieved, milestoneId]))
  try {
    const ref = doc(db, 'profiles', userId)
    await updateDoc(ref, {
      achieved_milestones: updated,
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Error claiming milestone:', err)
  }
}
