export interface Achievement {
    id: number;
    name: string;
    description: string;
    icon_url?: string;
    xp_reward: number;
    unlocked_at?: string; // ISO date string if unlocked
}

export interface UserReputation {
    xp: number;
    level: number;
    achievements: Achievement[];
}
