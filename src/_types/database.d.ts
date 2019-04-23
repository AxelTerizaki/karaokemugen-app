export interface Settings {
	baseChecksum?: string,
	lastGeneration?: number
}

export interface Query {
	sql: string,
	params?: any[][]
}

export interface LangClause {
	main: string
	fallback: string
}