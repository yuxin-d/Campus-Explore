import {InsightDataset, InsightError} from "./IInsightFacade";

export default class ValidQuery{
	private dataset: string[];
	private thisdataset: number;

	constructor(dataset: InsightDataset[]) {
		this.dataset = dataset.map((item) => item.id);
		this.thisdataset = -1;
	}

	public validateColumns(cols: string[], trans: any | null) {

		let fields = ["_dept", "_id", "_instructor", "_title", "_uuid", "_fullname", "_shortname", "_number",
			"name", "_address", "_type", "_furniture", "_href","_avg", "_pass", "_fail", "_audit", "_year",
			"_lat", "_lon", "_seats"];
		let addon: string[] = [];
		if (trans && trans["APPLY"]) {
			addon = trans["APPLY"].map((item: any) => {
				let keys = Object.keys(item);
				if (keys.length > 1) {
					throw new InsightError("Apply rule should only have 1 key, has " + keys.length);
				}
				return keys[0];
			});
		}
		if (cols === null || cols === undefined || cols.length < 1) {
			throw new InsightError("Invalid or empty column");
		}
		cols.forEach((element: string) => {
			if (!fields.includes("_" + element.split("_")[1]) && !addon.includes(element)) {
				throw new InsightError(`Invalid key ${element} in COLUMNS`);
			}
		});
	}

	public isValidQuery(query: any): boolean {
		const LOGIC = ["OR", "AND", "NOT"];
		const MCOMPARATOR = ["LT", "GT", "EQ"];
		const QUERYKEY = ["WHERE", "OPTIONS", "TRANSFORMATIONS"];
		const OPTIONSKEYS = ["COLUMNS", "ORDER"];

		if (!query["WHERE"] || !query["OPTIONS"]) {
			throw new InsightError("MISSING WHERE/OPTIONS");
		}
		if (!query["OPTIONS"]["COLUMNS"]) {
			throw new InsightError("OPTIONS missing COLUMNS");
		}
		this.validateColumns(query["OPTIONS"]["COLUMNS"], query["TRANSFORMATIONS"]);
		const querykey = Object.keys(query["WHERE"])[0];
		this.checkKeys(LOGIC, MCOMPARATOR, querykey);
		if (query["WHERE"][querykey] === null || query["WHERE"][querykey] === undefined
			|| JSON.stringify(query["WHERE"][querykey]).length <= 2) {
			throw new InsightError("Empty or invalid key-value Object");
		}
		// this.grabDataset(query, querykey);
		this.validationSelect(LOGIC, query, querykey, MCOMPARATOR);

		const options = Object.keys(query["OPTIONS"]);
		for (let option of options) {
			if (!OPTIONSKEYS.includes(option)) {
				throw new InsightError("Invalid keys in OPTIONS");
			}
		}
		if (query["OPTIONS"]["ORDER"]) {
			if (!query["OPTIONS"]["COLUMNS"].includes(query["OPTIONS"]["ORDER"])) {
				throw new InsightError("ORDER key must be in COLUMNS");
			}
		}
		for (let key of Object.keys(query)) {
			if (!QUERYKEY.includes(key)) {
				throw new InsightError("Invalid Section in Query");
			}
		}

		return true;
	}

	private handleLOGIC(query: any | any[], filter: string) {
		const LOGIC = ["OR", "AND", "NOT"];
		const MCOMPARATOR = ["LT", "GT", "EQ"];
		if(filter === "NOT") {
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
		}else {
			if (typeof query !== "object" && query.length <= 2) {
				throw new InsightError("There is an empty or invalid AND or OR");
			}
			query.forEach((q: any) => {
				const key = Object.keys(q)[0];
				this.checkKeys(LOGIC, MCOMPARATOR, key);
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
		// const sfield = ["courses_dept", "courses_id", "courses_instructor", "courses_title", "courses_uuid"];
		// const mfield = ["courses_avg", "courses_pass", "courses_fail", "courses_audit", "courses_year"];
		const sfield = ["_dept", "_id", "_instructor", "_title", "_uuid", "_fullname", "_shortname", "_number",
			"name", "_address", "_type", "_furniture", "_href"];
		const mfield = ["_avg", "_pass", "_fail", "_audit", "_year", "_lat", "_lon", "_seats"];
		const mkey = Object.keys(query)[0];
		if (typeof mkey !== typeof  "") {
			throw new InsightError("INVALID MCOMPARATOR");
		}
		const pre = mkey.split("_")[0];

		if (!this.dataset.includes(pre)) {
			throw new InsightError(`Referenced dataset ${pre} not added yet`);
		}
		if (!mfield.includes("_" + mkey.split("_")[1]) && !sfield.includes("_" + mkey.split("_")[1])) {
			throw new InsightError(`Invalid key ${mkey} in GT`);
		}

		if (sfield.includes("_" + mkey.split("_")[1]) || typeof query[mkey] !== "number") {
			throw new InsightError("Invalid type in GT/LT/EQ, should be number");
		} else {
			if (this.thisdataset < 0) {
				this.thisdataset = this.dataset.indexOf(pre);
			} else {
				if (this.dataset.indexOf(pre) !== this.thisdataset) {
					throw new InsightError("duplicate Dataset");
				}
			}
		}

	}

	private handleSCOMPARISON(query: any) {
		const skey = Object.keys(query)[0];
		// const sfield = ["courses_dept", "courses_id", "courses_instructor", "courses_title", "courses_uuid"];
		// const mfield = ["courses_avg", "courses_pass", "courses_fail", "courses_audit", "courses_year"];
		const sfield = ["_dept", "_id", "_instructor", "_title", "_uuid", "_fullname", "_shortname", "_number",
			"name", "_address", "_type", "_furniture", "_href"];
		const mfield = ["_avg", "_pass", "_fail", "_audit", "_year", "_lat", "_lon", "_seats"];
		if (typeof skey !== typeof  "") {
			throw new InsightError("INVALID SCOMPARATOR");
		}
		if (!mfield.includes("_" + skey.split("_")[1]) && !sfield.includes("_" + skey.split("_")[1])) {
			throw new InsightError(`Invalid key ${skey} in GT/LT/EQ`);
		}
		// const pre = skey.split("_")[0];
		const value = query[skey];
		if (mfield.includes("_" + skey.split("_")[1]) || typeof query[skey] !== "string") {
			throw new InsightError("Invalid type in IS, should be string");
		} else {
			const pre = skey.split("_")[0];
			if (this.thisdataset < 0) {
				this.thisdataset = this.dataset.indexOf(pre);
			} else {
				if (this.dataset.indexOf(pre) !== this.thisdataset) {
					throw new InsightError("duplicate Dataset");
				}
			}
		}
		// let inputstring = value;
		// if (inputstring.endsWith("*")) {
		//  inputstring = inputstring.substring(0, inputstring.length - 1);
		// }

		// if (inputstring.startsWith("*")) {
		//  inputstring = inputstring.substring(1, inputstring.length);
		// }


		const reg = new RegExp("^\\*?[^*]*\\*?$");
		if (!reg.test(value)) {
			throw new InsightError("Invalid type in IS");
		}
	}

	private validationSelect(LOGIC: string[], query: any, querykey: any, MCOMPARATOR: any) {
		// if (Object.keys(query["WHERE"][querykey])[0].split("_")[0]  !== this.thisdataset ) {
		// 	throw new InsightError("One query can only search in one dataset");
		// }
		if (LOGIC.includes(querykey)) {
			this.handleLOGIC(query["WHERE"][querykey], querykey);
		} else if (MCOMPARATOR.includes(querykey)) {
			this.handleMCOMPARATOR(query["WHERE"][querykey]);
		} else if (querykey === "IS") {
			this.handleSCOMPARISON(query["WHERE"][querykey]);
		}
	}

	private checkKeys(LOGIC: any, MCOMPARATOR: any, key: any) {
		if (!LOGIC.includes(key) && !MCOMPARATOR.includes(key) && key !== "IS") {
			throw new InsightError("Invalid filter key: " + key);
		}
	}
}
