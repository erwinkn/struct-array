/** Approaches to user-defined merges / invariants:
 * - `merge` function in mergeable replicated data types
 * - logical predicates on the data structure + reordering of operations based on those (ECROs)
 * - forking histories (TreeDB)
 *
 * Short version:
 * - `merge` function
 * - define operations + potential conflicts + resolution strategies
 * - automatically detect conflicts through read + write conflict sets & expose them in returned data
 */

export type Schema = Record<string, TableSchema>;
export type TableSchema = Record<string, "number" | "string" | "boolean">;
type ColumnValue = TableSchema[string];
type JSType<V extends ColumnValue> = V extends "number"
	? number
	: V extends "string"
	? string
	: V extends "boolean"
	? boolean
	: never;

export type Instance<S extends TableSchema> = {
	[K in keyof S]: JSType<S[K]>;
};

type RowTypes<S extends Schema> = {
	[K in keyof S]: Instance<S[K]>;
};

type Row<S extends Schema, Name extends TableNames<S>> = RowTypes<S>[Name];

type TestSchema = {
	foo: {
		a: "number";
		b: "boolean";
	};
	bar: {
		name: "string";
	};
};

type X = RowTypes<TestSchema>;

type TableNames<S extends Schema> = keyof S;

type AddTable<
	S extends Schema,
	Name extends string,
	TS extends TableSchema
> = S & {
	[K in Name]: TS;
};

export type CRDB<S extends Schema> = {
	createTable<Table extends string, TS extends TableSchema>(
		name: Table,
		schema: TS
	): CRDB<AddTable<S, Table, TS>>;
	insert<Table extends TableNames<S>>(table: Table, row: Row<S, Table>): void;
};

function test(db: CRDB<{}>) {
	const db2 = db.createTable("foo", {
		a: "number",
		b: "boolean",
	});

	db2.insert("foo", {
		a: 2,
		b: true,
	});
}

type Timestamp = [agent: number, seq: number];

type Insert = {
	op: "insert";
	table: string;
	id: string;
	columns: unknown[];
};

type Update = {
	op: "update";
	table: string;
	id: string;
	columns: string[];
	values: unknown[];
};

type Delete = {
	op: "delete";
	table: string;
	id: string;
};

type Operation = Insert | Update | Delete;

// class OpLog {
// 	operations: Array<Operation> = [];
// 	received: Map<number, Array<number>> = new Map();
// 	pending: Map<number, Array<Operation>> = new Map();

// 	add(op: Operation, agent: number, seq: number): Array<Operation> {}
// }

// // Each row has one timestamp per column, indicating the last modification date
// export type Row = {
// 	id: string;
// 	// Columns and timestamps have the same length
// 	// All rows in a table have the same number of columns, we just don't enforce anything right now
// 	columns: any[];
// 	timestamps: Timestamp[];
// 	// In practice we could merge those two, but this is more readable
// 	created: Timestamp;
// 	deleted: Timestamp | null;
// };

// export class DB {
// 	agent: number;
// 	sequence: number = 0;
// 	seen: Map<number, number> = new Map();
// 	tables: Map<string, Table> = new Map();

// 	constructor(agent: number) {
// 		this.agent = agent;
// 	}

// 	register(table: Table) {
// 		if (this.tables.has(table.name)) {
// 			throw new Error(`The table ${table.name} already exists`);
// 		}
// 		this.tables.set(table.name, table);
// 	}

// 	next(): Timestamp {
// 		return [this.agent, this.sequence++];
// 	}

// 	hasSeen(time: Timestamp): boolean {
// 		const lastSeen = this.seen.get(time[0]) || -1;
// 		return lastSeen >= time[1];
// 	}
// }

// export class Table<S extends TableSchema> {
// 	db: DB;
// 	name: string;
// 	schema: S;
// 	columns: string[];
// 	rows: Map<string, Row> = new Map();

// 	constructor(db: DB, name: string, schema: S) {
// 		this.db = db;
// 		this.name = name;
// 		this.schema = schema;
// 		this.columns = Object.keys(schema);
// 		db.register(this);
// 	}

// 	select(id: string, columns: string[]) {
// 		const row = this.get(id);
// 		const selection = columns.map((c) => this.columns.indexOf(c));
// 		const result = new Array(selection.length);
// 		for (const idx of selection) {
// 			result.push(row.columns[idx]);
// 		}
// 		return result;
// 	}

// 	get(id: string) {
// 		const row = this.rows.get(id);
// 		if (!row || row.deleted != null) {
// 			throw new Error(`No row with ID ${id} in table ${this.name}`);
// 		}
// 		return row;
// 	}

// 	insert(id: string, columns: unknown[]) {
// 		if (columns.length != this.columns.length) {
// 			throw new Error(
// 				`Row and table ${this.name} have different number of columns (table: ${this.columns.length}, row: ${columns.length})`
// 			);
// 		}
// 		const row = this.rows.get(id);
// 		if (row && row.deleted === null) {
// 			throw new Error(
// 				`Insertion error: a row with id "${id}" already exists in ${this.name}`
// 			);
// 		}

// 		const time = this.db.next();
// 		this.rows.set(id, {
// 			id,
// 			columns,
// 			created: time,
// 			deleted: null,
// 			timestamps: new Array<Timestamp>(columns.length).fill(time),
// 		});
// 	}

// 	update(id: string, column: string, value: any) {
// 		const pos = this.columns.indexOf(column);
// 		if (pos < 0) {
// 			throw new Error(`Invalid column ${column} for table ${this.name}`);
// 		}
// 		const row = this.get(id);
// 		const time = this.db.next();
// 		row.columns[pos] = value;
// 		row.timestamps[pos] = time;
// 	}

// 	delete(id: string) {
// 		const row = this.get(id);
// 		const time = this.db.next();
// 		row.deleted = time;
// 	}

// 	merge(other: Table, otherDoc: DB) {
// 		if (
// 			other.name !== this.name ||
// 			other.columns.length !== this.columns.length
// 		) {
// 			throw new Error("incompatible tables");
// 		}
// 		for (const [id, otherRow] of other.rows) {
// 			const thisRow = this.get(id);
// 			if (!thisRow) {
// 				this.rows.set(id, otherRow);
// 			} else {
// 				// Scenario 1: 2 rows with the same ID but different insertion times
// 				// [edge case]
// 				if (!eqTime(otherRow.created, thisRow.created)) {
// 					const concurrent =
// 						!this.db.hasSeen(otherRow.created) &&
// 						!otherDoc.hasSeen(thisRow.created);
// 					if (!concurrent) {
// 						throw new Error("UNDEFINED BEHAVIOR");
// 					}

// 					// Pick the row with the greatest timestamp
// 					const pickOther = isGreater(otherRow.created, thisRow.created);
// 					if (pickOther) {
// 						this.rows.set(id, otherRow);
// 						// Continue is important here!
// 						continue;
// 					}
// 				}

// 				// Scenario 2: we have a row that may have been modified elsewhere, so we look for changes that we want to merge
// 				for (let i = 0; i < this.columns.length; i++) {}
// 			}
// 		}
// 	}
// }

// function eqTime(t1: Timestamp, t2: Timestamp) {
// 	return t1[0] === t2[0] && t1[1] === t2[1];
// }

// function isGreater(t1: Timestamp, t2: Timestamp) {
// 	return t1[0] > t2[0] || t1[0] > t2[0];
// }
