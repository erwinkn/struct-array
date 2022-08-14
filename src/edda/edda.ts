interface PersistenceAdapter {
	mode: 'normal' | 'incremental';
}

type Collection = {
	name: string;
	objType: string;
	data: unknown[];
}

type EddaOptions = {
	env?: 'NODEJS' | 'BROWSER' | 'CORDOVA';
	
	autosave?: boolean;
	autosaveInterval?: number;
	autosaveCallback?: () => void;
	throttledSaves?: boolean;
	autoload?: boolean;
	
	// Added the `indexeddb` option here (only provided through an adapter in LokiJS)
	persistenceMethod?: 'fs' | 'localstorage' | 'indexeddb' | 'memory';
	adapter?: PersistenceAdapter;
	serializationMethod?: 'normal' | 'pretty' | 'destructured';
	destructureDelimiter?: string;

	verbose?: boolean;
};

const defaultOptions: EddaOptions = {
	autosave: false,
	autosaveInterval: 5000,
	throttledSaves: true,
	autoload: false,

	serializationMethod: 'normal',
	destructureDelimiter: '$<\n',	
	verbose: false,
}

class Edda {
	readonly filename: string;
	readonly persistenceMethod: string;
	readonly persistenceAdapter: PersistenceAdapter;
	readonly isIncremental: boolean;

	private collections: unknown[] = [];
	private isIncremental: boolean;

	constructor(filename?: string, options?: EddaOptions) {
		this.filename = filename || 'loki.db';

	}

	// initialConfig == true when called from the constructor
	// this parameter is only used internally
	configureOptions(options: EddaOptions, initialConfig?: boolean) {

	}

	loadDatabase(options: EddaOptions, callback: () => void) {

	}

	autosaveEnable(options?: EddaOptions, callback?: () => void) {

	}

	autosaveDisable()
}

export function deepFreeze(x: unknown) {
	if (Array.isArray(x)) {
		for (let i = x.length - 1; i >= 0; i--) {
			deepFreeze(x[i]);
		}
	}
	// Because apparently `typeof null` returns "object"
	else if (x !== null && typeof x === "object") {
		for (const key in Object.keys(x)) {
			deepFreeze(x[key as keyof typeof x]);
		}
	}
	Object.freeze(x);
}

function unfreeze<T>(x: T): T {
	return structuredClone(x);
}
