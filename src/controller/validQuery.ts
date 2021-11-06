import {InsightError} from "./IInsightFacade";

export default class ValidQuery{
	public isValidQuery(query: any): boolean {
		const LOGIC = ["OR", "AND"];
		const MCOMPARATOR = ["LT", "GT", "EQ"];

		if (!query["WHERE"]) {
			throw new InsightError("MISSING WHERE");
		}

		const querykey = Object.keys(query["WHERE"])[0];

		if (LOGIC.includes(querykey)) {
			this.handleLOGIC(query["WHERE"][querykey]);
		} else if (MCOMPARATOR.includes(querykey)) {
			this.handleMCOMPARATOR(query["WHERE"][querykey]);
		} else if (querykey === "IS") {
			this.handleSCOMPARISON(query["WHERE"][querykey]);
		}

		return true;
	}

	private handleLOGIC(query: any) {
		const LOGIC = ["OR", "AND"];
		const MCOMPARATOR = ["LT", "GT", "EQ"];
		query.forEach((q: any) => {
			const key = Object.keys(q)[0];
			if (LOGIC.includes(key)) {
				this.handleLOGIC(q[key]);
			} else if (MCOMPARATOR.includes(key)) {
				this.handleMCOMPARATOR(q[key]);
			} else if (key === "IS") {
				this.handleSCOMPARISON(q[key]);
			}
		});
	}

	private handleMCOMPARATOR(query: any) {
		// const sfield = ["courses_dept", "courses_id", "courses_instructor", "courses_title", "courses_uuid"];
		// const mfield = ["courses_avg", "courses_pass", "courses_fail", "courses_audit", "courses_year"];
		const sfield = ["_dept", "id", "_instructor", "_title", "_uuid"];
		const mfield = ["_avg", "_pass", "_fail", "_audit", "_year"];

		const mkey = Object.keys(query)[0];

		if (!mfield.includes("_" + mkey.split("_")[1]) && !sfield.includes("_" + mkey.split("_")[1])) {
			throw new InsightError(`Invalid key ${mkey} in GT`);
		}

		if (mfield.includes("_" + mkey.split("_")[1]) && typeof query[mkey] !== "number") {
			throw new InsightError("Invalid type in GT, should be number");
		} else if (sfield.includes(mkey.split("_")[1]) && (typeof query[mkey] !== "string")) {
			throw new InsightError("Invalid type in GT, should be string");
		}

	}

	private handleSCOMPARISON(query: any) {
		const skey = Object.keys(query)[0];

		// const sfield = ["courses_dept", "courses_id", "courses_instructor", "courses_title", "courses_uuid"];
		// const mfield = ["courses_avg", "courses_pass", "courses_fail", "courses_audit", "courses_year"];
		const sfield = ["_dept", "_id", "_instructor", "_title", "_uuid"];
		const mfield = ["_avg", "_pass", "_fail", "_audit", "_year"];
		if (!mfield.includes("_" + skey.split("_")[1]) && !sfield.includes("_" + skey.split("_")[1])) {
			throw new InsightError(`Invalid key ${skey} in GT`);
		}
		const value = query[skey];
		if (typeof value !== "string") {
			throw new InsightError("Invalid type in IS, should be string");
		}
		// let inputstring = value;
		// if (inputstring.endsWith("*")) {
		//  inputstring = inputstring.substring(0, inputstring.length - 1);
		// }

		// if (inputstring.startsWith("*")) {
		//  inputstring = inputstring.substring(1, inputstring.length);
		// }


		const reg = new RegExp("^\\*?[^*]+\\*?$");
		if (!reg.test(value)) {
			throw new InsightError("Invalid type in IS");
		}
	}

}
