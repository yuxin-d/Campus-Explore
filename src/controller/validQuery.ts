import {InsightDataset, InsightError} from "./IInsightFacade";

const sfield = ["_dept", "_id", "_instructor", "_title", "_uuid", "_fullname", "_shortname", "_number",
	"_name", "_address", "_type", "_furniture", "_href"];
const mfield = ["_avg", "_pass", "_fail", "_audit", "_year", "_lat", "_lon", "_seats"];
const rsfiled = ["_fullname", "_shortname", "_number", "_name", "_address", "_type", "_href", "_furniture"];
const rmfiled = ["_lat", "_lon", "_seats"];
const csfiled = ["_dept", "_id", "_instructor", "_title", "_uuid"];
const cmfiled = ["_avg", "_pass", "_fail", "_audit", "_year"];
const ROOMS = "rooms";
const COURSES = "courses";
const LOGIC = ["OR", "AND", "NOT"];
const MCOMPARATOR = ["LT", "GT", "EQ"];
const QUERYKEY = ["WHERE", "OPTIONS", "TRANSFORMATIONS"];
const OPTIONSKEYS = ["COLUMNS", "ORDER"];
const APPLYTOKEN = ["MAX", "MIN", "AVG", "COUNT", "SUM"];

export default class ValidQuery{
	private dataset: string[];
	private thisdataset: number;
	private set: string[];

	constructor(dataset: InsightDataset[]) {
		this.dataset = dataset.map((item) => item.id);
		this.thisdataset = -1;
		this.set = [];
	}

	public validateColumns(cols: string[], trans: any | null) {
		let addon: string[] = [];
		if (!trans) {
			this.validateCol(cols);
			return;
		}
		if (trans && !trans["GROUP"]) {
			throw new InsightError("TRANSFORMATIONS missing GROUP");
		}
		if (this.validateGroup(trans["GROUP"])) {
			addon = [...trans["GROUP"]];
		}
		if (trans["APPLY"]) {
			if (!Array.isArray(trans["APPLY"])) {
				throw new InsightError("APPLY must be an array");
			}
			trans["APPLY"].forEach((item: any) => {
				let keys = Object.keys(item);
				this.validateApply(item);
				addon.push(keys[0]);
			});
		}
		cols.forEach((element: string) => {
			if (!addon.includes(element)) {
				throw new InsightError("Keys in COLUMNS must be in GROUP or APPLY when TRANSFORMATIONS is present");
			}
		});
	}

	private validateCol(cols: any) {
		if (cols && Array.isArray(cols)) {
			cols.forEach((element: string) => {
				if (![...mfield, ...sfield].includes("_" + element.split("_")[1])) {
					throw new InsightError(`Invalid key ${element} in COLUMNS`);
				}
			});
		}
	}

	private validateGroup(group: any) {
		if (!Array.isArray(group) || group.length === 0) {
			throw new InsightError("GROUP must be a non-empty array");
		}
		group.forEach((value) => {
			if (![...sfield, ...mfield].includes("_" + value.split("_")[1])) {
				throw new InsightError(`Invalid key ${value} in GROUP`);
			}
		});
		return true;
	}

	private validateApply(item: any) {
		let keys: string[] = Object.keys(item);
		if (keys.length > 1 || keys.length === 0) {
			throw new InsightError("Apply rule should only have 1 key, has " + keys.length);
		}
		if (this.set.includes(keys[0])) {
			throw new InsightError("Apply duplicate key " + keys[0]);
		}
		this.set.push(keys[0]);
		const applyObject = item[keys[0]];
		let applyItems: Array<[string, string]> = Object.entries(applyObject);
		if (applyItems.length === 0) {
			throw new InsightError("Apply rule should only have 1 key, has 0");
		}
		let applykeys: any[] = [];
		applyItems.forEach(([i, value]) => {
			if (applykeys.includes(i)) {
				throw new InsightError("Duplicated applykey");
			}
			applykeys.push(i);
			if (!APPLYTOKEN.includes(i)) {
				throw new InsightError("Invalid transformation operator");
			}
			if (i === "COUNT") {
				return;
			}
			if (!mfield.includes("_" + value.split("_")[1])) {
				throw new InsightError("Invalid key type in " + i);
			}
		});
	}

	private validateKey(key: string) {
		// console.log(key, this.set);
		if (key.split("_")[0] === ROOMS && [...rmfiled, ...rsfiled].includes("_" + key.split("_")[1])) {
			return true;
		}
		if (key.split("_")[0] === COURSES && [...cmfiled, ...csfiled].includes("_" + key.split("_")[1])) {
			return true;
		}
		if (!this.dataset.includes(key.split("_")[0])) {
			throw new InsightError(`Referenced dataset ${key.split("_")[0]} not added yet`);
		}
		return false;
	}

	public isValidQuery(query: any): boolean {
		if (!query["WHERE"] || !query["OPTIONS"] || Object.keys(query.WHERE).length > 1) {
			throw new InsightError("MISSING WHERE/OPTIONS");
		}
		if (!query["OPTIONS"]["COLUMNS"]) {
			throw new InsightError("OPTIONS missing COLUMNS");
		}
		this.validateColumns(query["OPTIONS"]["COLUMNS"], query["TRANSFORMATIONS"]);
		this.handleOPTIONS(query["OPTIONS"]);
		const options = Object.keys(query["OPTIONS"]);
		for (let option of options) {
			if (!OPTIONSKEYS.includes(option)) {
				throw new InsightError("Invalid keys in OPTIONS");
			}
		}
		const querykey = Object.keys(query["WHERE"])[0];
		if (!querykey) {
			return true;
		}
		this.checkKeys(querykey);
		if (query["WHERE"][querykey] === null || query["WHERE"][querykey] === undefined
			|| JSON.stringify(query["WHERE"][querykey]).length <= 2) {
			throw new InsightError("Empty or invalid key-value Object");
		}
		this.validationSelect(query, querykey);

		for (let key of Object.keys(query)) {
			if (!QUERYKEY.includes(key)) {
				throw new InsightError("Invalid QUERYKEY");
			}
		}
		return true;
	}

	private handleOPTIONS(options: any | any[]) {
		const DIRKEYS = ["UP", "DOWN"];
		const ORDERKEYS = ["dir", "keys"];
		if (!Array.isArray(options["COLUMNS"]) || options["COLUMNS"].length === 0) {
			throw new InsightError("COLUMNS must be a non-empty array");
		}
		if (options["ORDER"]) {
			if (typeof options["ORDER"] === "string" && !options["COLUMNS"].includes(options["ORDER"])) {
				throw new InsightError("ORDER key must be in COLUMNS");
			} else if (typeof options["ORDER"] === "object") {

				Object.keys(options["ORDER"]).forEach((key) => {
					if (!ORDERKEYS.includes(key)) {
						throw new InsightError("invalid ORDER key");
					}
				});
				if (!(options["ORDER"].dir && DIRKEYS.includes(options["ORDER"].dir))) {
					throw new InsightError("invalid ORDER dir");
				}

				if (options["ORDER"].keys && options["ORDER"].keys.length !== 0) {
					options["ORDER"].keys.forEach((k: string) => {
						if (!options["COLUMNS"].includes(k)) {
							throw new InsightError("invalid ORDER key");
						}
					});
				} else {
					throw new InsightError("ORDER missing 'keys' key");
				}
			}
		}
	}

	private handleLOGIC(query: any | any[], filter: string) {
		if (filter === "NOT") {
			if (JSON.stringify(query).length <= 2 || typeof query !== "object") {
				throw new InsightError("There is an empty or invalid NOT");
			}
			const key = Object.keys(query)[0];
			if (LOGIC.includes(key)) {
				this.handleLOGIC(query[key], key);
			} else if (MCOMPARATOR.includes(key)) {
				this.handleMCOMPARATOR(query[key]);
			} else if (key === "IS") {
				this.handleSCOMPARISON(query[key]);
			}
		} else {
			if ((!Array.isArray(query)) || query.length < 1) {
				throw new InsightError("There is an empty or invalid AND or OR");
			}
			query.forEach((q: any) => {
				const key = Object.keys(q)[0];
				this.checkKeys(key);
				if (LOGIC.includes(key)) {
					this.handleLOGIC(q[key], key);
				} else if (MCOMPARATOR.includes(key)) {
					this.handleMCOMPARATOR(q[key]);
				} else if (key === "IS") {
					this.handleSCOMPARISON(q[key]);
				}
			});
		}
	}

	private handleMCOMPARATOR(query: any) {
		if (typeof query !== "object" || Object.keys(query).length !== 1) {
			throw new InsightError("Invalid Object in query-M");
		}
		const mkey = Object.keys(query)[0];
		if (!mkey) {
			throw new InsightError(`${mkey} should only have 1 key, has 0`);
		}
		if (typeof mkey !== typeof "") {
			throw new InsightError("INVALID MCOMPARATOR");
		}
		if (!this.validateKey(mkey)) {
			throw new InsightError(`Invalid key ${mkey} in GT`);
		}
		if (sfield.includes("_" + mkey.split("_")[1]) || typeof query[mkey] !== "number") {
			throw new InsightError("Invalid type in GT/LT/EQ, should be number");
		} else {
			this.datasetCheck(mkey);
		}
	}

	private handleSCOMPARISON(query: any) {
		if (typeof query !== "object" || Object.keys(query).length !== 1) {
			throw new InsightError("Invalid Object in query-M");
		}
		const skey = Object.keys(query)[0];
		if (!this.validateKey(skey)) {
			throw new InsightError(`Invalid key ${skey} in IS`);
		}
		if (typeof skey !== typeof  "") {
			throw new InsightError("INVALID SCOMPARATOR");
		}
		if (!mfield.includes("_" + skey.split("_")[1]) && !sfield.includes("_" + skey.split("_")[1])) {
			throw new InsightError(`Invalid key ${skey} in IS`);
		}
		const value = query[skey];
		if (mfield.includes("_" + skey.split("_")[1]) || typeof query[skey] !== "string") {
			throw new InsightError("Invalid type in IS, should be string");
		} else {
			this.datasetCheck(skey);
		}
		const reg = new RegExp("^\\*?[^*]*\\*?$");
		if (!reg.test(value)) {
			throw new InsightError("Invalid type in IS");
		}
	}

	private validationSelect(query: any, querykey: any) {
		if (LOGIC.includes(querykey)) {
			this.handleLOGIC(query["WHERE"][querykey], querykey);
		} else if (MCOMPARATOR.includes(querykey)) {
			this.handleMCOMPARATOR(query["WHERE"][querykey]);
		} else if (querykey === "IS") {
			this.handleSCOMPARISON(query["WHERE"][querykey]);
		}
	}

	private checkKeys(key: any) {
		if (!LOGIC.includes(key) && !MCOMPARATOR.includes(key) && key !== "IS") {
			throw new InsightError("Invalid filter key: " + key);
		}
	}

	private datasetCheck(key: string) {
		const pre = key.split("_")[0];
		if (this.thisdataset < 0) {
			this.thisdataset = this.dataset.indexOf(pre);
		} else {
			if (this.dataset.indexOf(pre) !== this.thisdataset) {
				throw new InsightError("duplicate Dataset");
			}
		}
	}
}
