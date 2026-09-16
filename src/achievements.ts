import type { PlayStats } from './game-state'

export interface Achievement {
	id: string
	name: string
	description: string
	condition: (stats: PlayStats, session: number) => boolean
}

export const ACHIEVEMENTS: readonly Achievement[] = [
	{
		id: 'first-bits',
		name: 'FIRST BITS',
		description: 'COLLECT 100 BITS',
		condition: (stats) => stats.bits >= 100,
	},
	{
		id: 'bit-whisperer',
		name: 'BIT WHISPERER',
		description: 'COLLECT 500 BITS',
		condition: (stats) => stats.bits >= 500,
	},
	{
		id: 'vault-keeper',
		name: 'VAULT KEEPER',
		description: 'REACH SESSION 2',
		condition: (_stats, session) => session >= 2,
	},
	{
		id: 'deep-diver',
		name: 'DEEP DIVER',
		description: 'REACH SESSION 4',
		condition: (_stats, session) => session >= 4,
	},
	{
		id: 'daemon-hunter',
		name: 'DAEMON HUNTER',
		description: 'EAT 5 SCARED DAEMONS',
		condition: (stats) => stats.daemons >= 5,
	},
	{
		id: 'ghostbuster',
		name: 'GHOSTBUSTER',
		description: 'DESTROY THE GLITCH',
		condition: (stats) => stats.ghosts >= 1,
	},
	{
		id: 'combo-master',
		name: 'COMBO MASTER',
		description: 'HIT A x5 BIT COMBO',
		condition: (stats) => stats.maxCombo >= 5,
	},
	{
		id: 'warp-jockey',
		name: 'WARP JOCKEY',
		description: 'USE 3 TELEPORTS',
		condition: (stats) => stats.teleportUses >= 3,
	},
	{
		id: 'frostbite',
		name: 'FROSTBITE',
		description: 'USE 3 FREEZE PILLS',
		condition: (stats) => stats.freezeUses >= 3,
	},
	{
		id: 'pill-runner',
		name: 'PILL RUNNER',
		description: 'EAT 5 ANTIVIRUS PILLS',
		condition: (stats) => stats.pills >= 5,
	},
]

export const UNDYING: Achievement = {
	id: 'undying',
	name: 'UNDYING',
	description: 'CLEAR A SESSION WITHOUT A LIFE LOST',
	condition: () => false,
}

export const ALL_ACHIEVEMENTS: readonly Achievement[] = [
	...ACHIEVEMENTS,
	UNDYING,
]